const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');
const { PaperBannerGenerator } = require('./paper-banner-generator');

const execAsync = promisify(exec);

// Character name: Meera
class CharacterCutoutAnimator {
  constructor(options = {}) {
    this.characterDir = options.characterDir || path.join(
      process.cwd(),
      'Assets',
      'Character Paper Cut Clip'
    );
    this.transitionsDir = options.transitionsDir || path.join(
      process.cwd(),
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

    const cmd = `ffmpeg -y \
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

    await execAsync(cmd);
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

    const cmd = `ffmpeg -y \
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

    await execAsync(cmd);
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
      const posePath = path.join(this.characterDir, chosenPoseFile);
      const bannerPath = path.join(tempDir, `banner_${i}.png`);

      console.log(`  🎭 [Meera Pop ${i + 1}/${popTimestamps.length}] @ ${tSec}s (Pose: "${chosenPoseFile}", Msg #${msgIdx})...`);

      const bannerInfo = await this.bannerGenerator.renderBannerPng({
        outputPath: bannerPath,
        messageIndex: msgIdx,
        width: 520,
        height: 94
      });

      const meta = await sharp(posePath).metadata();
      const scale = 0.78;
      const charW = Math.round((meta.width || 500) * scale);
      const charH = Math.round((meta.height || 650) * scale);
      const bannerW = bannerInfo.width;
      const bannerH = bannerInfo.height;

      const charTargetX = 1920 - charW - 35;
      const charTargetY = 1080 - charH + 10;
      const charStartY = 1080 + 20;
      const bannerTargetX = charTargetX - bannerW + 70;
      const bannerStartX = charTargetX + 40;
      const bannerY = 1080 - Math.round(charH * 0.65);

      const charPopIn = 0.35;
      const bannerSlideIn = 0.35;
      const bannerSlideOut = 0.30;
      const charPopOut = 0.35;
      const popDur = 3.8;

      const tOffset = tSec;
      const bannerStartT = tOffset + 0.30;
      const bannerEndT = tOffset + popDur - bannerSlideOut - 0.15;
      const charExitT = tOffset + popDur - charPopOut;
      const popEndT = tOffset + popDur;

      const dt = `(t-${tOffset})`;
      const charYExpr = `if(lt(${dt},${charPopIn}),${charStartY}-(${charStartY}-${charTargetY})*(1-cos(PI*${dt}/(2*${charPopIn}))),if(lt(${dt},${charExitT - tOffset}),${charTargetY}+5*sin(4*PI*trunc(${dt}*6)/6),${charTargetY}+(${charStartY}-${charTargetY})*(1-cos(PI*(${dt}-${charExitT - tOffset})/(2*${charPopOut})))))`;
      const charRotExpr = `if(lt(${dt},${charExitT - tOffset}),0.035*sin(5*PI*trunc(${dt}*5)/5),0)`;
      const bannerXExpr = `if(lt(t,${bannerStartT}),${bannerStartX},if(lt(t,${bannerStartT + bannerSlideIn}),${bannerStartX}+(${bannerTargetX}-${bannerStartX})*(1-cos(PI*(t-${bannerStartT})/(2*${bannerSlideIn}))),if(lt(t,${bannerEndT}),${bannerTargetX}+3*sin(4*PI*trunc(t*6)/6),${bannerTargetX}+(${bannerStartX}-${bannerTargetX})*(1-cos(PI*(t-${bannerEndT})/(2*${bannerSlideOut}))))))`;
      const bannerRotExpr = `if(lt(t,${bannerEndT}),0.02*sin(4*PI*trunc(t*5)/5),0)`;

      popData.push({
        tSec, posePath, bannerPath, chosenPoseFile, msgIdx,
        charW, charH, bannerW, bannerH,
        charTargetX, charTargetY, charStartY, bannerTargetX, bannerStartX, bannerY,
        bannerStartT, bannerEndT, charExitT, popEndT,
        charYExpr, charRotExpr, bannerXExpr, bannerRotExpr,
        delayPopMs: Math.round(tSec * 1000 + 50),
        delayClickMs: Math.round(tSec * 1000 + 320)
      });
    }

    // Build SINGLE FFmpeg command with all overlays in one filter_complex
    const sfxPop = path.join(this.transitionsDir, 'air-move.wav');
    const sfxClick = path.join(this.transitionsDir, 'Click Original.mp3');

    // Inputs: [0] base video, then pairs of [char, banner] per pop, then [sfxPop, sfxClick]
    const inputArgs = [`-i "${inputVideo}"`];
    let inputIdx = 1;
    const charInputs = [];
    const bannerInputs = [];

    for (const pop of popData) {
      inputArgs.push(`-f image2 -loop 1 -i "${pop.posePath}"`);
      charInputs.push(inputIdx++);
      inputArgs.push(`-f image2 -loop 1 -i "${pop.bannerPath}"`);
      bannerInputs.push(inputIdx++);
    }

    const sfxPopIdx = inputIdx++;
    const sfxClickIdx = inputIdx++;
    inputArgs.push(`-i "${sfxPop}"`);
    inputArgs.push(`-i "${sfxClick}"`);

    // Build filter graph — chain all overlays
    let filterParts = [];
    let audioMixParts = ['[0:a]'];

    for (let i = 0; i < popData.length; i++) {
      const p = popData[i];
      const cIdx = charInputs[i];
      const bIdx = bannerInputs[i];
      const suffix = `_p${i}`;

      filterParts.push(`[${cIdx}:v]format=rgba,scale=${p.charW}:${p.charH},rotate='${p.charRotExpr}':ow=${p.charW + 60}:oh=${p.charH + 60}:c=black@0[char_raw${suffix}]`);
      filterParts.push(`[char_raw${suffix}]split[char_fg${suffix}][char_sh_raw${suffix}]`);
      filterParts.push(`[char_sh_raw${suffix}]colorchannelmixer=aa=0.45:rr=0:gg=0:bb=0,gblur=sigma=16[char_sh${suffix}]`);

      filterParts.push(`[${bIdx}:v]format=rgba,scale=${p.bannerW}:${p.bannerH},rotate='${p.bannerRotExpr}':ow=${p.bannerW + 40}:oh=${p.bannerH + 40}:c=black@0[ban_raw${suffix}]`);
      filterParts.push(`[ban_raw${suffix}]split[ban_fg${suffix}][ban_sh_raw${suffix}]`);
      filterParts.push(`[ban_sh_raw${suffix}]colorchannelmixer=aa=0.40:rr=0:gg=0:bb=0,gblur=sigma=14[ban_sh${suffix}]`);

      const prevVideo = i === 0 ? '[0:v]' : `[v_out_${i - 1}]`;
      const outLabel = `[v_out_${i}]`;

      filterParts.push(`${prevVideo}[ban_sh${suffix}]overlay='${p.bannerXExpr}+10':'${p.bannerY}+12':enable='between(t,${p.bannerStartT},${p.bannerEndT + 0.30})'[v_bansh${suffix}]`);
      filterParts.push(`[v_bansh${suffix}][ban_fg${suffix}]overlay='${p.bannerXExpr}':'${p.bannerY}':enable='between(t,${p.bannerStartT},${p.bannerEndT + 0.30})'[v_ban${suffix}]`);
      filterParts.push(`[v_ban${suffix}][char_sh${suffix}]overlay=${p.charTargetX}+12:'${p.charYExpr}+14':enable='between(t,${p.tSec},${p.popEndT})'[v_charsh${suffix}]`);
      filterParts.push(`[v_charsh${suffix}][char_fg${suffix}]overlay=${p.charTargetX}:'${p.charYExpr}':enable='between(t,${p.tSec},${p.popEndT})'${outLabel}`);

      audioMixParts.push(`[sfx_pop${suffix}]`);
      audioMixParts.push(`[sfx_click${suffix}]`);
      filterParts.push(`[${sfxPopIdx}:a]adelay=${p.delayPopMs}|${p.delayPopMs},volume=0.30[sfx_pop${suffix}]`);
      filterParts.push(`[${sfxClickIdx}:a]adelay=${p.delayClickMs}|${p.delayClickMs},volume=0.35[sfx_click${suffix}]`);
    }

    const finalVideo = popData.length > 0 ? `[v_out_${popData.length - 1}]` : '[0:v]';
    filterParts.push(`${audioMixParts.join('')}amix=inputs=${audioMixParts.length}:duration=first:dropout_transition=2:normalize=0[outa]`);

    const filterComplex = filterParts.join('; ');

    const cmd = `ffmpeg -y \
      ${inputArgs.join(' \
      ')} \
      -filter_complex "${filterComplex}" \
      -map "${finalVideo}" -map "[outa]" \
      -shortest \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
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
}

module.exports = { CharacterCutoutAnimator };
