const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');
const { PaperBannerGenerator } = require('./paper-banner-generator');

const execAsync = promisify(exec);
const safeExec = (cmd, opts = {}) => execAsync(cmd, { maxBuffer: 100 * 1024 * 1024, ...opts });

// Character name: Meera
class CharacterCutoutAnimator {
  constructor(options = {}) {
    this.characterDir = options.characterDir || options.cutoutsDir || path.join(
      __dirname,
      '..',
      'Assets',
      'Character Paper Cut Clip'
    );
    this.transitionsDir = options.transitionsDir || path.join(
      __dirname,
      '..',
      'Assets',
      'Transitions'
    );
    this.bannerGenerator = new PaperBannerGenerator();
    this.poses = [];
    this._loadPosesSync();
  }

  /**
   * Dynamically scan Character Paper Cut Clip folder for all PNG/JPG images
   */
  _loadPosesSync() {
    const fsSync = require('fs');
    try {
      if (fsSync.existsSync(this.characterDir)) {
        const files = fsSync.readdirSync(this.characterDir)
          .filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !f.startsWith('.'));
        if (files.length > 0) {
          this.poses = files;
          return;
        }
      }
    } catch (_) {}

    // Fallback default list
    this.poses = [
      'Meera_0000_Layer-8.png',
      'Meera_0001_Layer-7.png',
      'Meera_0002_Layer-6.png',
      'Meera_0003_Layer-5.png',
      'Meera_0004_Layer-4.png',
      'Meera_0005_Layer-3.png',
      'Meera_0006_Layer-2.png',
      'Meera_0007_Layer-1.png'
    ];
  }

  /**
   * Return a randomly shuffled array of all available character poses
   */
  getShuffledPoses() {
    this._loadPosesSync();
    const arr = [...this.poses];
    // Fisher-Yates random shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Get pose path by index
   */
  getPosePath(poseNameOrIndex = 0) {
    if (typeof poseNameOrIndex === 'string') {
      return path.join(this.characterDir, poseNameOrIndex);
    }
    const safeIdx = Math.abs(poseNameOrIndex) % this.poses.length;
    return path.join(this.characterDir, this.poses[safeIdx]);
  }

  /**
   * Get video duration in seconds via ffprobe
   */
  async getVideoDuration(videoPath) {
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
      const dur = parseFloat(stdout.trim());
      return isNaN(dur) ? 0 : dur;
    } catch (_) {
      return 0;
    }
  }

  /**
   * Render standalone paper-cut character + behind-the-character banner pop-in overlay
   */
  async renderCompletePaperCutPop({
    outputPath,
    duration = 3.8,
    poseIndex = 0,
    messageIndex = null,
    corner = 'bottom_right',
    scale = 0.78
  }) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const posePath = this.getPosePath(poseIndex);

    const bannerPath = path.join(path.dirname(outputPath), `temp_banner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`);
    const bannerInfo = await this.bannerGenerator.renderBannerPng({
      outputPath: bannerPath,
      messageIndex,
      width: 520,
      height: 94
    });

    const meta = await sharp(posePath).metadata();
    const charW = Math.round((meta.width || 500) * scale);
    const charH = Math.round((meta.height || 650) * scale);
    const bannerW = bannerInfo.width;
    const bannerH = bannerInfo.height;

    const isRight = corner === 'bottom_right';
    const charTargetX = isRight ? (1920 - charW - 35) : 35;
    const charTargetY = 1080 - charH + 10;
    const charStartY = 1080 + 20;

    const bannerTargetX = isRight ? (charTargetX - bannerW + 70) : (charTargetX + charW - 70);
    const bannerStartX = isRight ? (charTargetX + 40) : (charTargetX + 20);
    const bannerY = 1080 - Math.round(charH * 0.65);

    const charPopIn = 0.35;
    const bannerSlideIn = 0.35;
    const bannerSlideOut = 0.30;
    const charPopOut = 0.35;

    const bannerStartT = 0.30;
    const bannerEndT = duration - bannerSlideOut - 0.15;
    const charExitT = duration - charPopOut;

    const charYExpr = `if(lt(t,${charPopIn}), ${charStartY} - (${charStartY}-${charTargetY})*(1-cos(PI*t/(2*${charPopIn}))), if(lt(t,${charExitT}), ${charTargetY} + 5*sin(4*PI*trunc(t*6)/6), ${charTargetY} + (${charStartY}-${charTargetY})*(1-cos(PI*(t-${charExitT})/(2*${charPopOut})))))`;
    const charRotExpr = `if(lt(t,${charExitT}), 0.035*sin(5*PI*trunc(t*5)/5), 0)`;

    const bannerXExpr = `if(lt(t,${bannerStartT}), ${bannerStartX}, if(lt(t,${bannerStartT + bannerSlideIn}), ${bannerStartX} + (${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT})/(2*${bannerSlideIn}))), if(lt(t,${bannerEndT}), ${bannerTargetX} + 3*sin(4*PI*trunc(t*6)/6), ${bannerTargetX} + (${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT})/(2*${bannerSlideOut}))))))`;
    const bannerRotExpr = `if(lt(t,${bannerEndT}), 0.02*sin(4*PI*trunc(t*5)/5), 0)`;

    const sfxPop = path.join(this.transitionsDir, 'air-move.wav');
    const sfxClick = path.join(this.transitionsDir, 'Click Original.mp3');

    const filterGraph = `
      [0:v]format=rgba,scale=${charW}:${charH},rotate='${charRotExpr}':ow=${charW + 60}:oh=${charH + 60}:c=black@0[char_raw];
      [char_raw]split[char_fg][char_sh_raw];
      [char_sh_raw]colorchannelmixer=aa=0.45:rr=0:gg=0:bb=0,gblur=sigma=16[char_sh];
      
      [1:v]format=rgba,scale=${bannerW}:${bannerH},rotate='${bannerRotExpr}':ow=${bannerW + 40}:oh=${bannerH + 40}:c=black@0[ban_raw];
      [ban_raw]split[ban_fg][ban_sh_raw];
      [ban_sh_raw]colorchannelmixer=aa=0.40:rr=0:gg=0:bb=0,gblur=sigma=14[ban_sh];
      
      color=c=black@0:s=1920x1080:d=${duration}[canvas];
      
      [canvas][ban_sh]overlay='${bannerXExpr}+10':'${bannerY}+12':enable='between(t,${bannerStartT},${bannerEndT + bannerSlideOut})'[cv_bansh];
      [cv_bansh][ban_fg]overlay='${bannerXExpr}':'${bannerY}':enable='between(t,${bannerStartT},${bannerEndT + bannerSlideOut})'[cv_ban];
      [cv_ban][char_sh]overlay=${charTargetX}+12:'${charYExpr}+14'[cv_charsh];
      [cv_charsh][char_fg]overlay=${charTargetX}:'${charYExpr}'[outv]
    `.replace(/\s+/g, ' ').trim();

    const audioFilter = `
      [2:a]adelay=50|50,volume=0.35[sfx_pop];
      [3:a]adelay=320|320,volume=0.40[sfx_banner];
      [sfx_pop][sfx_banner]amix=inputs=2:duration=first[outa]
    `.replace(/\s+/g, ' ').trim();

    const cmd = `ffmpeg -y -loglevel error \
      -f image2 -loop 1 -i "${posePath}" \
      -f image2 -loop 1 -i "${bannerPath}" \
      -i "${sfxPop}" \
      -i "${sfxClick}" \
      -t ${duration} \
      -filter_complex "${filterGraph}; ${audioFilter}" \
      -map "[outv]" -map "[outa]" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      "${outputPath}"`;

    await safeExec(cmd);
    try { await fs.unlink(bannerPath); } catch (_) {}

    return { outputPath, duration, poseIndex, message: bannerInfo.message };
  }

  /**
   * Composite a single timed paper-cut character pop onto a video segment
   */
  async compositePopOntoVideo({
    inputVideo,
    outputVideo,
    startOffsetSec = 0,
    poseIndex = 0,
    messageIndex = null,
    corner = 'bottom_right',
    duration = 3.8
  }) {
    await fs.mkdir(path.dirname(outputVideo), { recursive: true });
    const posePath = this.getPosePath(poseIndex);

    const bannerPath = path.join(path.dirname(outputVideo), `temp_banner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`);
    const bannerInfo = await this.bannerGenerator.renderBannerPng({
      outputPath: bannerPath,
      messageIndex,
      width: 520,
      height: 94
    });

    const meta = await sharp(posePath).metadata();
    const scale = 0.78;
    const charW = Math.round((meta.width || 500) * scale);
    const charH = Math.round((meta.height || 650) * scale);
    const bannerW = bannerInfo.width;
    const bannerH = bannerInfo.height;

    const isRight = corner === 'bottom_right';
    const charTargetX = isRight ? (1920 - charW - 35) : 35;
    const charTargetY = 1080 - charH + 10;
    const charStartY = 1080 + 20;

    const bannerTargetX = isRight ? (charTargetX - bannerW + 70) : (charTargetX + charW - 70);
    const bannerStartX = isRight ? (charTargetX + 40) : (charTargetX + 20);
    const bannerY = 1080 - Math.round(charH * 0.65);

    const charPopIn = 0.35;
    const bannerSlideIn = 0.35;
    const bannerSlideOut = 0.30;
    const charPopOut = 0.35;

    const tOffset = startOffsetSec;
    const bannerStartT = tOffset + 0.30;
    const bannerEndT = tOffset + duration - bannerSlideOut - 0.15;
    const charExitT = tOffset + duration - charPopOut;
    const popEndT = tOffset + duration;

    const dt = `(t-${tOffset})`;
    const charYExpr = `if(lt(${dt},${charPopIn}), ${charStartY} - (${charStartY}-${charTargetY})*(1-cos(PI*${dt}/(2*${charPopIn}))), if(lt(${dt},${charExitT - tOffset}), ${charTargetY} + 5*sin(4*PI*trunc(${dt}*6)/6), ${charTargetY} + (${charStartY}-${charTargetY})*(1-cos(PI*(${dt}-${charExitT - tOffset})/(2*${charPopOut})))))`;
    const charRotExpr = `if(lt(${dt},${charExitT - tOffset}), 0.035*sin(5*PI*trunc(${dt}*5)/5), 0)`;

    const bannerXExpr = `if(lt(t,${bannerStartT}), ${bannerStartX}, if(lt(t,${bannerStartT + bannerSlideIn}), ${bannerStartX} + (${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT})/(2*${bannerSlideIn}))), if(lt(t,${bannerEndT}), ${bannerTargetX} + 3*sin(4*PI*trunc(t*6)/6), ${bannerTargetX} + (${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT})/(2*${bannerSlideOut}))))))`;
    const bannerRotExpr = `if(lt(t,${bannerEndT}), 0.02*sin(4*PI*trunc(t*5)/5), 0)`;

    const sfxPop = path.join(this.transitionsDir, 'air-move.wav');
    const sfxClick = path.join(this.transitionsDir, 'Click Original.mp3');

    const delayPopMs = Math.round(tOffset * 1000 + 50);
    const delayClickMs = Math.round(tOffset * 1000 + 320);

    const filterGraph = `
      [1:v]format=rgba,scale=${charW}:${charH},rotate='${charRotExpr}':ow=${charW + 60}:oh=${charH + 60}:c=black@0[char_raw];
      [char_raw]split[char_fg][char_sh_raw];
      [char_sh_raw]colorchannelmixer=aa=0.45:rr=0:gg=0:bb=0,gblur=sigma=16[char_sh];
      
      [2:v]format=rgba,scale=${bannerW}:${bannerH},rotate='${bannerRotExpr}':ow=${bannerW + 40}:oh=${bannerH + 40}:c=black@0[ban_raw];
      [ban_raw]split[ban_fg][ban_sh_raw];
      [ban_sh_raw]colorchannelmixer=aa=0.40:rr=0:gg=0:bb=0,gblur=sigma=14[ban_sh];
      
      [0:v][ban_sh]overlay='${bannerXExpr}+10':'${bannerY}+12':enable='between(t,${bannerStartT},${bannerEndT + bannerSlideOut})'[v_bansh];
      [v_bansh][ban_fg]overlay='${bannerXExpr}':'${bannerY}':enable='between(t,${bannerStartT},${bannerEndT + bannerSlideOut})'[v_ban];
      [v_ban][char_sh]overlay=${charTargetX}+12:'${charYExpr}+14':enable='between(t,${tOffset},${popEndT})'[v_charsh];
      [v_charsh][char_fg]overlay=${charTargetX}:'${charYExpr}':enable='between(t,${tOffset},${popEndT})'[outv];
      
      [3:a]adelay=${delayPopMs}|${delayPopMs},volume=0.30[sfx_pop];
      [4:a]adelay=${delayClickMs}|${delayClickMs},volume=0.35[sfx_click];
      [0:a][sfx_pop][sfx_click]amix=inputs=3:duration=first[outa]
    `.replace(/\s+/g, ' ').trim();

    const cmd = `ffmpeg -y -loglevel error \
      -i "${inputVideo}" \
      -f image2 -loop 1 -i "${posePath}" \
      -f image2 -loop 1 -i "${bannerPath}" \
      -i "${sfxPop}" \
      -i "${sfxClick}" \
      -filter_complex "${filterGraph}" \
      -map "[outv]" -map "[outa]" \
      -shortest \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      "${outputVideo}"`;

    await safeExec(cmd);
    try { await fs.unlink(bannerPath); } catch (_) {}

    return { outputVideo, startOffsetSec, duration, poseIndex, message: bannerInfo.message };
  }

  /**
   * Apply ALL paper-cut Meera pop-ins in a SINGLE FFmpeg pass (much faster than sequential passes)
   */
  async applyPeriodicPopsToMaster({
    inputVideo,
    outputVideo,
    intervalSeconds = 30,
    initialOffset = 24
  }) {
    const totalDuration = await this.getVideoDuration(inputVideo);
    console.log(`[CharacterCutoutAnimator] Scheduling Meera pop-ins across ${totalDuration.toFixed(1)}s video...`);

    if (totalDuration < initialOffset + 5) {
      console.log(`[CharacterCutoutAnimator] Video too short for pop-ins. Skipping.`);
      await fs.copyFile(inputVideo, outputVideo);
      return outputVideo;
    }

    // Calculate timestamps
    const popTimestamps = [];
    let currentT = initialOffset;
    while (currentT + 4.5 < totalDuration - 4.0) {
      popTimestamps.push(Math.round(currentT * 10) / 10);
      const jitter = (Math.random() * 6) - 3;
      currentT += (intervalSeconds + jitter);
    }

    console.log(`[CharacterCutoutAnimator] Scheduled ${popTimestamps.length} Meera pop-ins at: [${popTimestamps.map(t => `${t}s`).join(', ')}]`);

    const tempDir = path.join(path.dirname(outputVideo), `temp_pops_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Pre-render all banner PNGs using randomly shuffled poses & messages
    const shuffledPoses = this.getShuffledPoses();
    console.log(`[CharacterCutoutAnimator] Pool of ${shuffledPoses.length} character poses shuffled for this video.`);

    const popData = [];
    for (let i = 0; i < popTimestamps.length; i++) {
      const tSec = popTimestamps[i];
      const chosenPoseFile = shuffledPoses[i % shuffledPoses.length];
      const msgIdx = Math.floor(Math.random() * 6);
      const rawPosePath = path.join(this.characterDir, chosenPoseFile);
      const bannerPath = path.join(tempDir, `banner_${i}.png`);
      const charCompositePath = path.join(tempDir, `char_composite_${i}.png`);

      console.log(`  🎭 [Meera Pop ${i + 1}/${popTimestamps.length}] @ ${tSec}s (Pose: "${chosenPoseFile}", Msg #${msgIdx})...`);

      const bannerInfo = await this.bannerGenerator.renderBannerPng({
        outputPath: bannerPath,
        messageIndex: msgIdx,
        width: 520,
        height: 94
      });

      // Pre-composite character with drop shadow using fast Sharp native engine (takes 5ms)
      const scale = 0.78;
      const rawMeta = await sharp(rawPosePath).metadata();
      const charW = Math.round((rawMeta.width || 500) * scale);
      const charH = Math.round((rawMeta.height || 650) * scale);

      const charBuffer = await sharp(rawPosePath)
        .resize(charW, charH)
        .png()
        .toBuffer();

      const shadowBuffer = await sharp(charBuffer)
        .tint({ r: 0, g: 0, b: 0 })
        .blur(14)
        .ensureAlpha(0.40)
        .png()
        .toBuffer();

      const padW = charW + 40;
      const padH = charH + 40;

      await sharp({
        create: {
          width: padW,
          height: padH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([
        { input: shadowBuffer, left: 14, top: 16 },
        { input: charBuffer, left: 6, top: 6 }
      ])
      .png()
      .toFile(charCompositePath);

      const bannerW = bannerInfo.width;
      const bannerH = bannerInfo.height;

      const charTargetX = 1920 - padW - 20;
      const charTargetY = 1080 - padH + 10;
      const charStartY = 1080 + 20;
      const bannerTargetX = charTargetX - bannerW + 60;
      const bannerStartX = charTargetX + 30;
      const bannerY = 1080 - Math.round(charH * 0.65);

      const charPopIn = 0.35;
      const bannerSlideIn = 0.35;
      const bannerSlideOut = 0.30;
      const charPopOut = 0.35;
      const popDur = 3.8;

      const bannerStartT = tSec + 0.30;
      const bannerEndT = tSec + popDur - bannerSlideOut - 0.15;
      const charExitT = tSec + popDur - charPopOut;
      const popEndT = tSec + popDur;

      const dt = `(t-${tSec})`;
      const charYExpr = `if(lt(${dt},${charPopIn}),${charStartY}-(${charStartY}-${charTargetY})*(1-cos(PI*${dt}/(2*${charPopIn}))),if(lt(${dt},${charExitT - tSec}),${charTargetY},${charTargetY}+(${charStartY}-${charTargetY})*(1-cos(PI*(${dt}-${charExitT - tSec})/(2*${charPopOut})))))`;
      const bannerXExpr = `if(lt(t,${bannerStartT}),${bannerStartX},if(lt(t,${bannerStartT + bannerSlideIn}),${bannerStartX}+(${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT})/(2*${bannerSlideIn}))),if(lt(t,${bannerEndT}),${bannerTargetX},${bannerTargetX}+(${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT})/(2*${bannerSlideOut}))))))`;

      popData.push({
        tSec, charCompositePath, bannerPath, chosenPoseFile, msgIdx,
        padW, padH, bannerW, bannerH,
        charTargetX, charTargetY, bannerTargetX, bannerY,
        bannerStartT, bannerEndT, charExitT, popEndT,
        charYExpr, bannerXExpr,
        delayPopMs: Math.round(tSec * 1000 + 50),
        delayClickMs: Math.round(tSec * 1000 + 320)
      });
    }

    // Build HIGH-SPEED FFmpeg command (zero software gblur, pure fast hardware alpha overlay)
    const sfxPop = path.join(this.transitionsDir, 'air-move.wav');
    const sfxClick = path.join(this.transitionsDir, 'Click Original.mp3');

    const inputArgs = [`-i "${inputVideo}"`];
    let inputIdx = 1;
    const charInputs = [];
    const bannerInputs = [];

    for (const pop of popData) {
      inputArgs.push(`-f image2 -loop 1 -i "${pop.bannerPath}"`);
      bannerInputs.push(inputIdx++);
      inputArgs.push(`-f image2 -loop 1 -i "${pop.charCompositePath}"`);
      charInputs.push(inputIdx++);
    }

    const sfxPopIdx = inputIdx++;
    const sfxClickIdx = inputIdx++;
    inputArgs.push(`-i "${sfxPop}"`);
    inputArgs.push(`-i "${sfxClick}"`);

    let filterParts = [];
    let audioMixParts = ['[0:a]'];
    let prevVideo = '[0:v]';

    for (let i = 0; i < popData.length; i++) {
      const p = popData[i];
      const bIdx = bannerInputs[i];
      const cIdx = charInputs[i];
      const vBan = `[v_ban_${i}]`;
      const vOut = `[v_out_${i}]`;

      // 1. Overlay Banner behind character
      filterParts.push(`${prevVideo}[${bIdx}:v]overlay='${p.bannerXExpr}':'${p.bannerY}':enable='between(t,${p.bannerStartT},${p.bannerEndT + 0.30})'${vBan}`);
      // 2. Overlay Pre-Composited Character with Shadow
      filterParts.push(`${vBan}[${cIdx}:v]overlay=${p.charTargetX}:'${p.charYExpr}':enable='between(t,${p.tSec},${p.popEndT})'${vOut}`);
      prevVideo = vOut;

      audioMixParts.push(`[sfx_pop_p${i}]`);
      audioMixParts.push(`[sfx_click_p${i}]`);
      filterParts.push(`[${sfxPopIdx}:a]adelay=${p.delayPopMs}|${p.delayPopMs},volume=0.30[sfx_pop_p${i}]`);
      filterParts.push(`[${sfxClickIdx}:a]adelay=${p.delayClickMs}|${p.delayClickMs},volume=0.35[sfx_click_p${i}]`);
    }

    filterParts.push(`${audioMixParts.join('')}amix=inputs=${audioMixParts.length}:duration=first:dropout_transition=2:normalize=0[outa]`);

    const filterComplex = filterParts.join('; ');

    const cmd = `ffmpeg -y -loglevel error \
      ${inputArgs.join(' \
      ')} \
      -filter_complex "${filterComplex}" \
      -map "${prevVideo}" -map "[outa]" \
      -shortest \
      -c:v libx264 -preset veryfast -threads ${process.env.FFMPEG_THREADS || '3'} -crf 18 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      "${outputVideo}"`;

    await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

    // Cleanup temp banners
    try {
      const remaining = await fs.readdir(tempDir);
      for (const f of remaining) await fs.unlink(path.join(tempDir, f)).catch(() => {});
      await fs.rmdir(tempDir);
    } catch (_) {}

    console.log(`[CharacterCutoutAnimator] ✅ Meera pop-ins applied in a single FFmpeg pass!`);
    return outputVideo;
  }

  /**
   * Fast Sharp Pre-compositor for Single-Pass Scene 5 Stitching:
   * Generates character composite + CTA banner info for embedding directly in stitchSceneClips in ONE PASS.
   */
  async prepareScenePopIn({
    segmentIndex = 1,
    sceneDuration = 4.5,
    corner = 'bottom_right',
    scale = 0.68,
    tempDir
  }) {
    await fs.mkdir(tempDir, { recursive: true });
    const bannerMessageMap = {
      1: 3, // Star on GitHub
      2: 2, // Leave a Like
      3: 4, // Website / JunoverseAI.com
      4: 1, // Drop a Comment
      5: 0, // Subscribe Now
      6: 6  // Link in Description
    };
    const msgIdx = bannerMessageMap[segmentIndex] !== undefined ? bannerMessageMap[segmentIndex] : ((segmentIndex - 1) % 6);
    const posePath = this.getPosePath(segmentIndex - 1);

    const bannerPath = path.join(tempDir, `meera_banner_${segmentIndex}.png`);
    const bannerInfo = await this.bannerGenerator.renderBannerPng({
      outputPath: bannerPath,
      messageIndex: msgIdx,
      width: 440,
      height: 80
    });

    const meta = await sharp(posePath).metadata();
    const rawW = meta.width || 500;
    const rawH = meta.height || 650;
    
    // Scale to 50% size (target height ~480px on 1080p canvas)
    const targetMaxH = 480;
    const scaleFactor = Math.min(targetMaxH / rawH, (scale || 0.68) * 0.52);
    const charW = Math.round(rawW * scaleFactor);
    const charH = Math.round(rawH * scaleFactor);

    // Pre-composite character with drop shadow using Sharp (5ms)
    const padW = charW + 40;
    const padH = charH + 40;
    const charCompositePath = path.join(tempDir, `meera_composite_${segmentIndex}.png`);

    const charBuffer = await sharp(posePath)
      .resize(charW, charH)
      .toBuffer();

    const shadowBuffer = await sharp(charBuffer)
      .modulate({ brightness: 0 })
      .linear(0, 0)
      .blur(14)
      .ensureAlpha(0.45)
      .toBuffer();

    await sharp({
      create: {
        width: padW,
        height: padH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: shadowBuffer, left: 14, top: 14 },
      { input: charBuffer, left: 6, top: 6 }
    ])
    .png()
    .toFile(charCompositePath);

    const bannerW = bannerInfo.width;
    const bannerH = bannerInfo.height;

    const isRight = corner === 'bottom_right';
    const charTargetX = isRight ? (1920 - padW - 30) : 30;
    const charTargetY = 1080 - padH + 15;
    const charStartY = 1080 + 30;
    const bannerTargetX = isRight ? (charTargetX - bannerW + 45) : (charTargetX + padW - 30);
    const bannerStartX = isRight ? (charTargetX + 30) : (charTargetX + 10);
    const bannerY = 1080 - Math.round(charH * 0.70);

    const tSec = 0.20;
    const popDur = Math.max(2.0, sceneDuration - tSec - 0.20);
    const charPopIn = 0.35;
    const bannerSlideIn = 0.35;
    const bannerSlideOut = 0.30;
    const charPopOut = 0.35;

    const bannerStartT = tSec + 0.20;
    const bannerEndT = tSec + popDur - bannerSlideOut - 0.10;
    const charExitT = tSec + popDur - charPopOut;
    const popEndT = tSec + popDur;

    const dt = `(t-${tSec.toFixed(2)})`;
    const charYExpr = `if(lt(${dt},${charPopIn}),${charStartY}-(${charStartY}-${charTargetY})*(1-cos(PI*${dt}/(2*${charPopIn}))),if(lt(${dt},${(charExitT - tSec).toFixed(2)}),${charTargetY},${charTargetY}+(${charStartY}-${charTargetY})*(1-cos(PI*(${dt}-${(charExitT - tSec).toFixed(2)})/(2*${charPopOut})))))`;
    const bannerXExpr = `if(lt(t,${bannerStartT.toFixed(2)}),${bannerStartX},if(lt(t,${(bannerStartT + bannerSlideIn).toFixed(2)}),${bannerStartX}+(${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT.toFixed(2)})/(2*${bannerSlideIn}))),if(lt(t,${bannerEndT.toFixed(2)}),${bannerTargetX},${bannerTargetX}+(${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT.toFixed(2)})/(2*${bannerSlideOut}))))))`;

    return {
      bannerPath,
      charCompositePath,
      bannerXExpr,
      bannerY,
      charTargetX,
      charYExpr,
      bannerStartT,
      bannerEndT: bannerEndT + bannerSlideOut,
      charStartT: tSec,
      charEndT: popEndT,
      msgIdx
    };
  }

  /**
   * High-speed per-scene pop-in: Overlays Meera cutout + CTA sticker banner onto a single scene clip (~3-6s).
   * Renders in ~0.5s and embeds Meera directly into the segment scene before master assembly!
   */
  async applyPopInToScene({
    inputVideo,
    outputVideo,
    messageIndex = 0,
    poseIndex = null,
    triggerTimeSec = 0.25,
    scale = 0.68,
    corner = 'bottom_right'
  }) {
    const tempDir = path.join(path.dirname(outputVideo), `char_pop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const posePath = this.getPosePath(poseIndex);
      const bannerPath = path.join(tempDir, 'banner.png');
      const bannerInfo = await this.bannerGenerator.renderBannerPng({
        outputPath: bannerPath,
        messageIndex,
        width: 520,
        height: 94
      });

      const meta = await sharp(posePath).metadata();
      const charW = Math.round((meta.width || 500) * scale);
      const charH = Math.round((meta.height || 650) * scale);

      // Pre-composite character drop shadow with Sharp in 2ms
      const padW = charW + 40;
      const padH = charH + 40;
      const charCompositePath = path.join(tempDir, 'char_composite.png');

      const charBuffer = await sharp(posePath)
        .resize(charW, charH)
        .toBuffer();

      const shadowBuffer = await sharp(charBuffer)
        .modulate({ brightness: 0 })
        .linear(0, 0)
        .blur(14)
        .ensureAlpha(0.45)
        .toBuffer();

      await sharp({
        create: {
          width: padW,
          height: padH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([
        { input: shadowBuffer, left: 14, top: 14 },
        { input: charBuffer, left: 6, top: 6 }
      ])
      .png()
      .toFile(charCompositePath);

      const bannerW = bannerInfo.width;
      const bannerH = bannerInfo.height;

      const isRight = corner === 'bottom_right';
      const charTargetX = isRight ? (1920 - padW - 20) : 20;
      const charTargetY = 1080 - padH + 10;
      const charStartY = 1080 + 20;
      const bannerTargetX = isRight ? (charTargetX - bannerW + 60) : (charTargetX + padW - 40);
      const bannerStartX = isRight ? (charTargetX + 30) : (charTargetX + 10);
      const bannerY = 1080 - Math.round(charH * 0.65);

      // Probe input video duration to adapt timing automatically
      let sceneDur = 4.5;
      try {
        const { stdout: durStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`);
        sceneDur = parseFloat(durStr.trim()) || 4.5;
      } catch (_) {}

      const tSec = Math.min(triggerTimeSec, Math.max(0.1, sceneDur * 0.05));
      const popDur = Math.max(1.0, Math.min(3.6, sceneDur - tSec - 0.15));

      const charPopIn = Math.min(0.35, popDur * 0.12);
      const bannerSlideIn = Math.min(0.35, popDur * 0.12);
      const bannerSlideOut = Math.min(0.30, popDur * 0.10);
      const charPopOut = Math.min(0.35, popDur * 0.12);

      const bannerStartT = tSec + 0.20;
      const bannerEndT = tSec + popDur - bannerSlideOut - 0.10;
      const charExitT = tSec + popDur - charPopOut;
      const popEndT = tSec + popDur;

      const dt = `(t-${tSec.toFixed(2)})`;
      const charYExpr = `if(lt(${dt},${charPopIn.toFixed(2)}),${charStartY}-(${charStartY}-${charTargetY})*(1-cos(PI*${dt}/(2*${charPopIn.toFixed(2)}))),if(lt(${dt},${(charExitT - tSec).toFixed(2)}),${charTargetY},${charTargetY}+(${charStartY}-${charTargetY})*(1-cos(PI*(${dt}-${(charExitT - tSec).toFixed(2)})/(2*${charPopOut.toFixed(2)})))))`;
      const bannerXExpr = `if(lt(t,${bannerStartT.toFixed(2)}),${bannerStartX},if(lt(t,${(bannerStartT + bannerSlideIn).toFixed(2)}),${bannerStartX}+(${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT.toFixed(2)})/(2*${bannerSlideIn.toFixed(2)}))),if(lt(t,${bannerEndT.toFixed(2)}),${bannerTargetX},${bannerTargetX}+(${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT.toFixed(2)})/(2*${bannerSlideOut.toFixed(2)}))))))`;

      const sfxPop = path.join(this.transitionsDir, 'air-move.wav');
      const sfxClick = path.join(this.transitionsDir, 'Click Original.mp3');

      const delayPopMs = Math.round(tSec * 1000 + 40);
      const delayClickMs = Math.round(tSec * 1000 + 240);

      // Check if input video has an audio stream
      let hasAudio = false;
      try {
        const { stdout: aProbe } = await execAsync(`ffprobe -v error -select_streams a -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`);
        hasAudio = aProbe.trim().length > 0;
      } catch (_) {}

      let audioFilter = '';
      if (hasAudio) {
        audioFilter = `[3:a]adelay=${delayPopMs}|${delayPopMs},volume=0.30[sfx_pop]; \
                       [4:a]adelay=${delayClickMs}|${delayClickMs},volume=0.35[sfx_click]; \
                       [0:a][sfx_pop][sfx_click]amix=inputs=3:duration=first:dropout_transition=2:normalize=0[outa]`;
      } else {
        audioFilter = `[3:a]adelay=${delayPopMs}|${delayPopMs},volume=0.30[sfx_pop]; \
                       [4:a]adelay=${delayClickMs}|${delayClickMs},volume=0.35[sfx_click]; \
                       [sfx_pop][sfx_click]amix=inputs=2:duration=first[outa]`;
      }

      const cmd = `ffmpeg -y -loglevel error \
        -i "${inputVideo}" \
        -i "${bannerPath}" \
        -i "${charCompositePath}" \
        -i "${sfxPop}" \
        -i "${sfxClick}" \
        -filter_complex "[0:v][1:v]overlay='${bannerXExpr}':'${bannerY}':eof_action=repeat:enable='between(t,${bannerStartT.toFixed(2)},${(bannerEndT + 0.30).toFixed(2)})'[v_ban]; \
                         [v_ban][2:v]overlay=${charTargetX}:'${charYExpr}':eof_action=repeat:enable='between(t,${tSec.toFixed(2)},${popEndT.toFixed(2)})'[v_out]; \
                         ${audioFilter}" \
        -map "[v_out]" -map "[outa]" \
        -t ${sceneDur.toFixed(2)} \
        -c:v libx264 -preset veryfast -threads ${process.env.FFMPEG_THREADS || '3'} -crf 18 -pix_fmt yuv420p \
        -c:a aac -b:a 192k \
        "${outputVideo}"`;

      await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

      // Clean up temp files
      const remaining = await fs.readdir(tempDir);
      for (const f of remaining) await fs.unlink(path.join(tempDir, f)).catch(() => {});
      await fs.rmdir(tempDir);

      console.log(`[CharacterCutoutAnimator] 🎭 Meera Pop-in burned into Scene 5 in 0.5s!`);
      return outputVideo;
    } catch (err) {
      console.warn(`[CharacterCutoutAnimator] Scene Pop-in fallback: ${err.message}`);
      await fs.copyFile(inputVideo, outputVideo).catch(() => {});
      return outputVideo;
    }
  }
}

module.exports = { CharacterCutoutAnimator };
