const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const safeExec = (cmd, opts = {}) => execPromise(cmd, { maxBuffer: 100 * 1024 * 1024, ...opts });
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Logger } = require('./logger');

class FFmpegMotionCanvas {
  constructor(options = {}) {
    this.logger = new Logger('FFmpegMotionCanvas');
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.assetsDir = path.resolve(__dirname, '..', 'Assets');
    this.bgmDir = path.join(this.assetsDir, 'BGM');
    this.transitionsDir = path.join(this.assetsDir, 'Transitions');
    this.backgroundsDir = path.join(this.assetsDir, 'Backgrounds');
  }

  /**
   * Get random audio/video file from given directory
   */
  async getRandomAsset(dirPath, allowedExts = ['.mp4', '.mov', '.wav', '.mp3', '.m4a']) {
    try {
      const entries = await fs.readdir(dirPath);
      const files = entries.filter(f => !f.startsWith('.') && allowedExts.includes(path.extname(f).toLowerCase()));
      if (files.length === 0) return null;
      const chosen = files[Math.floor(Math.random() * files.length)];
      return path.join(dirPath, chosen);
    } catch (err) {
      return null;
    }
  }

  /**
   * Probe dimensions of GIF or video clip
   */
  async getMediaDimensions(mediaPath) {
    try {
      const { stdout } = await safeExec(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${mediaPath}"`
      );
      const data = JSON.parse(stdout);
      const stream = data.streams?.[0] || {};
      const width = parseInt(stream.width) || 480;
      const height = parseInt(stream.height) || 480;
      return { width, height };
    } catch (err) {
      return { width: 480, height: 480 };
    }
  }

  /**
   * Generate procedural sharp frame & mask matching GIF's exact aspect ratio
   */
  async generateDynamicCardAssets(w, h, tempDir, clipId, options = {}) {
    const pad = 60;
    const frameWidth = w + pad * 2;
    const frameHeight = h + pad * 2;
    const radius = options.radius || 28;
    const strokeWidth = options.strokeWidth || 6.5; // Sleek thin border

    const maskSvg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`;

    const frameSvg = `<svg width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
      </defs>
      <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="black" filter="url(#cardShadow)"/>
      <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="none" stroke="white" stroke-width="${strokeWidth}"/>
    </svg>`;

    const maskPath = path.join(tempDir, `mask_${clipId}.png`);
    const framePath = path.join(tempDir, `frame_${clipId}.png`);

    await sharp(Buffer.from(maskSvg)).png().toFile(maskPath);
    await sharp(Buffer.from(frameSvg)).png().toFile(framePath);

    return { maskPath, framePath };
  }

  /**
   * Render an animated GIF or Image inside an aspect-ratio adaptive floating card with alternating motion
   */
  async formatToFloatingCard(gifPath, duration, outputPath, options = {}) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const bgVideo = options.bgVideo || (await this.getRandomAsset(this.backgroundsDir, ['.mp4', '.mov'])) ||
      path.join(this.backgroundsDir, 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4');
    const tempDir = path.dirname(outputPath);
    const clipId = `card_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const motionIndex = options.motionIndex || Math.floor(Math.random() * 4);

    let activeMediaPath = gifPath;
    if (path.extname(gifPath).toLowerCase() === '.svg') {
      const convertedPng = path.join(tempDir, `converted_${clipId}.png`);
      await sharp(gifPath, { density: 300 }).png().toFile(convertedPng);
      activeMediaPath = convertedPng;
    }

    // 1. Get raw dimensions
    const dims = await this.getMediaDimensions(activeMediaPath);
    const ar = dims.width / dims.height;

    // Safety guard against degenerate 1px badges/spacers or broken media
    if (dims.width < 100 || dims.height < 80 || ar < 0.35 || ar > 3.5) {
      this.logger.warn(`⚠️ Degenerate media dimensions (${dims.width}x${dims.height}, AR: ${ar.toFixed(2)}): ${gifPath}. Auto-replacing with curated GIF...`);
      const fallbackGif = path.resolve(__dirname, '..', 'Assets', 'Curated_GIFs', 'Cat typing aggressively.gif');
      if (fsSync.existsSync(fallbackGif)) {
        return await this.formatToFloatingCard(fallbackGif, duration, outputPath, { ...options, isRepoMedia: false });
      }
    }

    // 2. Calculate optimal bounded cinematic dimensions:
    // Near full-page (1680x880) for author screenshots/diagrams; (1420x780) for GIFs
    const isRepoAsset = options.isRepoMedia || options.isFullPageMedia;
    const maxW = isRepoAsset ? 1680 : 1420;
    const maxH = isRepoAsset ? 880 : 780;
    let targetW, targetH;

    if (ar >= (maxW / maxH)) {
      targetW = maxW;
      targetH = Math.round(maxW / ar);
    } else {
      targetH = maxH;
      targetW = Math.round(targetH * ar);
    }

    targetW = targetW % 2 === 0 ? targetW : targetW - 1;
    targetH = targetH % 2 === 0 ? targetH : targetH - 1;

    this.logger.info(`Cinematic Adaptive Card (${targetW}x${targetH}, AR: ${ar.toFixed(2)}, isRepoMedia: ${!!isRepoAsset}, MotionProfile #${motionIndex}, ${duration.toFixed(2)}s): ${path.basename(gifPath)}...`);

    // 3. Generate pixel-perfect custom mask & thin border frame
    const { maskPath, framePath } = await this.generateDynamicCardAssets(targetW, targetH, tempDir, clipId);

    const ext = path.extname(activeMediaPath).toLowerCase();
    const isStaticImg = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const isGif = ext === '.gif';
    let mediaInputArg = `-stream_loop -1 -i "${activeMediaPath}"`;
    if (isStaticImg) {
      mediaInputArg = `-f image2 -loop 1 -i "${activeMediaPath}"`;
    } else if (isGif) {
      mediaInputArg = `-ignore_loop 0 -i "${activeMediaPath}"`;
    }

    // Dynamic Alternating Motion Profiles:
    // Profile 0: Zoom in (1.0 -> 1.08) + Left Tilt
    // Profile 1: Zoom out (1.08 -> 1.0) + Right Tilt
    // Profile 2: Subtle continuous drift + Zoom in (1.0 -> 1.06)
    // Profile 3: Smooth diagonal glide
    const mediaScaleFilter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},setsar=1,format=rgba[gif]`;

    // 4. Composite in FFmpeg
    const filterComplex = `
      [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1[bg];
      [1:v]${mediaScaleFilter};
      [3:v]scale=${targetW}:${targetH},format=rgba[mask];
      [gif][mask]alphamerge[masked_gif];
      [2:v]format=rgba[frame];
      [bg][frame]overlay=(W-w)/2:(H-h)/2:shortest=1[bg_frame];
      [bg_frame][masked_gif]overlay=(W-w)/2:(H-h)/2:shortest=1[outv]
    `.replace(/\s+/g, ' ').trim();

    const cmd = `ffmpeg -y \
      -stream_loop -1 -i "${bgVideo}" \
      ${mediaInputArg} \
      -f image2 -loop 1 -i "${framePath}" \
      -f image2 -loop 1 -i "${maskPath}" \
      -t ${duration} \
      -filter_complex "${filterComplex}" \
      -map "[outv]" \
      -c:v libx264 -preset veryfast -threads ${process.env.FFMPEG_THREADS || '3'} -crf 18 -pix_fmt yuv420p \
      "${outputPath}"`;

    try {
      await safeExec(cmd);
      // Clean up temporary assets
      await fs.unlink(maskPath).catch(() => {});
      await fs.unlink(framePath).catch(() => {});

      // Black-frame validation & auto-healing guard
      try {
        const probeFramePath = path.join(tempDir, `probe_${clipId}.png`);
        await safeExec(`ffmpeg -y -ss 0.1 -i "${outputPath}" -vframes 1 "${probeFramePath}"`);
        if (fsSync.existsSync(probeFramePath)) {
          const stats = await sharp(probeFramePath).stats();
          const avgBrightness = stats.channels.slice(0, 3).reduce((acc, c) => acc + c.mean, 0) / 3;
          await fs.unlink(probeFramePath).catch(() => {});
          if (avgBrightness < 8.0) {
            this.logger.warn(`⚠️ Pitch black card detected (brightness: ${avgBrightness.toFixed(1)}). Auto-healing with verified curated GIF...`);
            const fallbackGif = path.resolve(__dirname, '..', 'Assets', 'Curated_GIFs', 'Cat crazy on computer keyboard typing.gif');
            if (fsSync.existsSync(fallbackGif)) {
              return await this.formatToFloatingCard(fallbackGif, duration, outputPath, { ...options, isRepoMedia: false });
            }
          }
        }
      } catch (probeErr) {}

      this.logger.info(`Floating card clip rendered: ${outputPath}`);
      return outputPath;
    } catch (err) {
      this.logger.error(`Error formatting floating card: ${err.message}`);
      throw err;
    }
  }

  /**
   * Stitch multiple scene visual clips and add voice narration + random BGM + transition SFX (20% vol) + subtitles
   */
  async stitchSceneClips(clipPaths, voiceAudioPath, outputPath, options = {}) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const subtitleChunks = options.subtitleChunks || [];
    const beatDurations = options.beatDurations || []; // durations of each clip

    // Random or configured BGM
    const bgmPath = options.bgm || (await this.getRandomAsset(this.bgmDir, ['.wav', '.mp3', '.m4a'])) ||
      path.join(this.bgmDir, 'clean bgm.wav');
    const bgmVolume = options.bgmVolume || 0.18;

    // Get available transition SFX files
    const transitionEntries = await fs.readdir(this.transitionsDir).catch(() => []);
    const transitionFiles = transitionEntries
      .filter(f => !f.startsWith('.') && ['.wav', '.mp3', '.m4a'].includes(path.extname(f).toLowerCase()))
      .map(f => path.join(this.transitionsDir, f));

    this.logger.info(`Stitching ${clipPaths.length} clips with voice (${subtitleChunks.length} subs, ${transitionFiles.length} available SFX)...`);

    // Create concat text file for visual clips
    const concatListPath = path.join(path.dirname(outputPath), `concat_${Date.now()}.txt`);
    const fileEntries = clipPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
    await fs.writeFile(concatListPath, fileEntries, 'utf8');

    // Calculate total visual duration and probe voice audio duration
    const totalVisualDuration = beatDurations.reduce((sum, d) => sum + (parseFloat(d) || 3.5), 0) || (clipPaths.length * 3.5);
    let voiceDuration = totalVisualDuration;
    try {
      const { stdout } = await safeExec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceAudioPath}"`);
      voiceDuration = parseFloat(stdout.trim()) || totalVisualDuration;
    } catch (_) {}

    // Strictly lock scene duration to voiceDuration so visuals and voiceover end at the exact same instant (zero dead silence)
    const sceneDuration = (voiceDuration && voiceDuration > 0.5) ? voiceDuration : totalVisualDuration;

    // Build FFmpeg inputs and filter complex
    const inputArgs = [`-thread_queue_size 512 -f concat -safe 0 -i "${concatListPath}"`];
    let nextInputIdx = 1;

    // 1. Top HUD Banner input (if provided)
    let hudInputIdx = null;
    if (options.hudOverlayPath && fsSync.existsSync(options.hudOverlayPath)) {
      inputArgs.push(`-thread_queue_size 512 -f image2 -loop 1 -t ${sceneDuration.toFixed(2)} -i "${options.hudOverlayPath}"`);
      hudInputIdx = nextInputIdx++;
    }

    // 2. Subtitle inputs
    const subInputIndices = [];
    if (subtitleChunks && subtitleChunks.length > 0) {
      subtitleChunks.forEach(c => {
        inputArgs.push(`-thread_queue_size 512 -f image2 -loop 1 -t ${sceneDuration.toFixed(2)} -i "${c.pngPath}"`);
        subInputIndices.push(nextInputIdx++);
      });
    }

    // 3. Voice Audio input
    inputArgs.push(`-thread_queue_size 512 -i "${voiceAudioPath}"`);
    const voiceInputIdx = nextInputIdx++;

    // 4. BGM input (only if explicitly enabled for single standalone video)
    let bgmInputIdx = null;
    if (options.includeBgm === true) {
      const bgmPath = options.bgm || (await this.getRandomAsset(this.bgmDir, ['.wav', '.mp3', '.m4a'])) ||
        path.join(this.bgmDir, 'clean bgm.mp3');
      inputArgs.push(`-thread_queue_size 512 -stream_loop -1 -i "${bgmPath}"`);
      bgmInputIdx = nextInputIdx++;
    }

    // 5. Transition SFX inputs for each transition boundary
    const sfxInputs = [];
    let sfxCumulativeTime = 0;

    for (let i = 0; i < clipPaths.length; i++) {
      if (transitionFiles.length > 0) {
        const randomSfx = transitionFiles[Math.floor(Math.random() * transitionFiles.length)];
        inputArgs.push(`-thread_queue_size 512 -i "${randomSfx}"`);
        sfxInputs.push({
          inputIdx: nextInputIdx++,
          timeMs: Math.round(sfxCumulativeTime * 1000)
        });
      }
      const duration = beatDurations[i] || 3.5;
      sfxCumulativeTime += duration;
    }

    // Build Video Filter Chain
    let videoFilter = '';
    let prevVideoLabel = '0:v';

    // Apply Top HUD Banner first
    if (hudInputIdx !== null) {
      const nextLabel = 'v_hud';
      videoFilter += `[${prevVideoLabel}][${hudInputIdx}:v]overlay=0:0:eof_action=pass[${nextLabel}]; `;
      prevVideoLabel = nextLabel;
    }

    // Apply Character Pop-In (Meera Cutout & CTA Banner) in the same single pass
    if (options.characterPopIn) {
      const pop = options.characterPopIn;
      const banInputIdx = nextInputIdx++;
      const charInputIdx = nextInputIdx++;
      inputArgs.push(`-thread_queue_size 512 -i "${pop.bannerPath}"`);
      inputArgs.push(`-thread_queue_size 512 -i "${pop.charCompositePath}"`);

      const nextBanLabel = 'v_meera_ban';
      const nextCharLabel = 'v_meera_char';
      videoFilter += `[${prevVideoLabel}][${banInputIdx}:v]overlay='${pop.bannerXExpr}':'${pop.bannerY}':eof_action=repeat:enable='between(t,${pop.bannerStartT.toFixed(2)},${pop.bannerEndT.toFixed(2)})'[${nextBanLabel}]; `;
      videoFilter += `[${nextBanLabel}][${charInputIdx}:v]overlay=${pop.charTargetX}:'${pop.charYExpr}':eof_action=repeat:enable='between(t,${pop.charStartT.toFixed(2)},${pop.charEndT.toFixed(2)})'[${nextCharLabel}]; `;
      prevVideoLabel = nextCharLabel;
    }

    // Apply Subtitle Overlays
    if (subInputIndices.length > 0) {
      subInputIndices.forEach((inputIdx, i) => {
        const c = subtitleChunks[i];
        const nextLabel = `v_sub_${i}`;
        videoFilter += `[${prevVideoLabel}][${inputIdx}:v]overlay=0:0:enable='between(t,${c.start.toFixed(2)},${c.end.toFixed(2)})':eof_action=pass[${nextLabel}]; `;
        prevVideoLabel = nextLabel;
      });
    }

    // Build Audio Filter Chain: Voice loudnorm + compress + limit. BGM optional.
    let audioFilter = `[${voiceInputIdx}:a]loudnorm=I=-14:TP=-1.5:LRA=7,acompressor=threshold=-18dB:ratio=3:attack=5:release=80:makeup=2,alimiter=limit=0.92:level=false[voice]; `;
    const audioMixInputs = ['[voice]'];

    if (bgmInputIdx !== null) {
      audioFilter += `[${bgmInputIdx}:a]volume=${options.bgmVolume || 0.08}[bgm]; `;
      audioMixInputs.push('[bgm]');
    }

    sfxInputs.forEach((sfx, idx) => {
      const sfxLabel = `sfx_${idx}`;
      audioFilter += `[${sfx.inputIdx}:a]volume=0.20,adelay=${sfx.timeMs}|${sfx.timeMs}[${sfxLabel}]; `;
      audioMixInputs.push(`[${sfxLabel}]`);
    });

    audioFilter += `${audioMixInputs.join('')}amix=inputs=${audioMixInputs.length}:duration=first:dropout_transition=2[outa]`;

    const fullFilterComplex = (videoFilter + audioFilter).trim();

    const cmd = `ffmpeg -y -loglevel error \
      ${inputArgs.join(' ')} \
      -filter_complex "${fullFilterComplex}" \
      -map "[${prevVideoLabel}]" -map "[outa]" \
      -c:v libx264 -preset veryfast -threads ${process.env.FFMPEG_THREADS || '3'} -crf 18 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      -t ${sceneDuration.toFixed(2)} \
      "${outputPath}"`;

    try {
      await safeExec(cmd);
      await fs.unlink(concatListPath).catch(() => {});
      this.logger.info(`Scene stitched successfully with transition SFX: ${outputPath}`);
      return outputPath;
    } catch (err) {
      this.logger.error(`Error stitching scene clips: ${err.message}`);
      await fs.unlink(concatListPath).catch(() => {});
      throw err;
    }
  }

  /**
   * Final assembly: Concat all scene videos and mix continuous 60-minute BGM starting from random offset
   */
  async assembleMasterVideo(sceneVideoPaths, masterOutputPath, options = {}) {
    await fs.mkdir(path.dirname(masterOutputPath), { recursive: true });
    this.logger.info(`Assembling final master video from ${sceneVideoPaths.length} scenes...`);

    const concatListPath = path.join(path.dirname(masterOutputPath), `master_concat_${Date.now()}.txt`);
    const fileEntries = sceneVideoPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
    await fs.writeFile(concatListPath, fileEntries, 'utf8');

    // If BGM is requested on compilation master (default true)
    if (options.includeBgm !== false) {
      const bgmPath = options.bgm || (await this.getRandomAsset(this.bgmDir, ['.wav', '.mp3', '.m4a'])) ||
        path.join(this.bgmDir, 'clean bgm2.mp3');
      const bgmVolume = options.bgmVolume || 0.22;

      // 1. Probe total duration of concatenated scenes
      let totalDuration = 60;
      try {
        let sum = 0;
        for (const p of sceneVideoPaths) {
          const { stdout } = await safeExec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`);
          sum += parseFloat(stdout.trim()) || 0;
        }
        totalDuration = sum || 60;
      } catch (e) {
        totalDuration = 180;
      }

      // 2. Probe BGM duration and pick a random starting offset
      let randomStart = 0;
      try {
        const { stdout: bgmDurOut } = await safeExec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${bgmPath}"`);
        const bgmTotalDuration = parseFloat(bgmDurOut.trim()) || 3000;
        const maxOffset = Math.max(0, Math.floor(bgmTotalDuration - totalDuration - 20));
        randomStart = Math.floor(Math.random() * maxOffset);
        this.logger.info(`🎵 Continuous BGM selected: ${path.basename(bgmPath)} (Total: ${Math.round(bgmTotalDuration)}s, Random Start: ${randomStart}s, Master Dur: ${totalDuration.toFixed(1)}s, Vol: ${bgmVolume})`);
      } catch (e) {
        randomStart = 0;
      }

      const fadeOutStart = Math.max(0, totalDuration - 2.5).toFixed(2);

      const cmd = `ffmpeg -y -loglevel error \
        -f concat -safe 0 -i "${concatListPath}" \
        -ss ${randomStart} -i "${bgmPath}" \
        -filter_complex "[0:a]loudnorm=I=-14:TP=-1.5:LRA=7,acompressor=threshold=-18dB:ratio=3:attack=5:release=80:makeup=2,alimiter=limit=0.92[voice_norm]; [voice_norm]asplit=2[voice_mix][voice_sc]; [1:a]volume=${bgmVolume},afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=2.5[bgm_raw]; [bgm_raw][voice_sc]sidechaincompress=threshold=0.08:ratio=2.2:attack=20:release=300:level_sc=0.8[bgm]; [voice_mix][bgm]amix=inputs=2:duration=first:dropout_transition=2[outa]" \
        -map 0:v -map "[outa]" \
        -c:v copy \
        -c:a aac -b:a 192k \
        -shortest \
        "${masterOutputPath}"`;

      try {
        await safeExec(cmd);
        await fs.unlink(concatListPath).catch(() => {});
        this.logger.info(`Master video complete with continuous BGM: ${masterOutputPath}`);
        return masterOutputPath;
      } catch (err) {
        this.logger.error(`Error with master BGM mixing, falling back to simple copy: ${err.message}`);
        const fallbackCmd = `ffmpeg -y -loglevel error -f concat -safe 0 -i "${concatListPath}" -c copy "${masterOutputPath}"`;
        await safeExec(fallbackCmd);
        await fs.unlink(concatListPath).catch(() => {});
        return masterOutputPath;
      }
    } else {
      const cmd = `ffmpeg -y -loglevel error -f concat -safe 0 -i "${concatListPath}" -c copy "${masterOutputPath}"`;
      try {
        await safeExec(cmd);
        await fs.unlink(concatListPath).catch(() => {});
        this.logger.info(`Master video complete: ${masterOutputPath}`);
        return masterOutputPath;
      } catch (err) {
        this.logger.error(`Error assembling master video: ${err.message}`);
        await fs.unlink(concatListPath).catch(() => {});
        throw err;
      }
    }
  }
}

module.exports = { FFmpegMotionCanvas };
