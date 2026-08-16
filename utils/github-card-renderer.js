const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const safeExec = (cmd, opts = {}) => execAsync(cmd, { maxBuffer: 100 * 1024 * 1024, ...opts });

class GitHubCardRenderer {
  constructor(options = {}) {
    this.bgVideo = options.bgVideo || path.join(process.cwd(), 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4');
    this.windowW = options.windowW || 1360;
    this.windowH = options.windowH || 760;
    this.headerH = options.headerH || 46;
  }

  /**
   * Procedurally generate CRT Terminal Overlay SVG
   */
  generateCRTOverlaySVG(repoName, starCount, sectionLabel = 'LIVE DEMO') {
    const contentH = this.windowH - this.headerH;
    return `
      <svg width="${this.windowW}" height="${this.windowH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Horizontal CRT Scanlines -->
          <pattern id="crt-scanlines" width="100%" height="3" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="${this.windowW}" y2="0" stroke="#000000" stroke-width="1.2" opacity="0.32" />
          </pattern>

          <!-- RGB Phosphor Dot Matrix -->
          <pattern id="pixel-lattice" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="2" height="2" fill="#00FFCC" opacity="0.06" />
            <rect x="2" y="0" width="2" height="2" fill="#FF0055" opacity="0.04" />
            <rect x="4" y="0" width="2" height="2" fill="#0088FF" opacity="0.05" />
          </pattern>

          <!-- Vignette Glass Curvature Shading -->
          <radialGradient id="crt-glass-glow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.03" />
            <stop offset="65%" stop-color="#000000" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
          </radialGradient>

          <linearGradient id="terminal-bar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#090D14" stop-opacity="0.98" />
            <stop offset="50%" stop-color="#111927" stop-opacity="0.98" />
            <stop offset="100%" stop-color="#090D14" stop-opacity="0.98" />
          </linearGradient>
        </defs>

        <!-- Scanlines & Lattice over screen content area -->
        <rect y="${this.headerH}" width="${this.windowW}" height="${contentH}" fill="url(#pixel-lattice)" />
        <rect y="${this.headerH}" width="${this.windowW}" height="${contentH}" fill="url(#crt-scanlines)" />
        <rect y="${this.headerH}" width="${this.windowW}" height="${contentH}" fill="url(#crt-glass-glow)" />

        <!-- Cyber Terminal Top Header Bar -->
        <rect x="0" y="0" width="${this.windowW}" height="${this.headerH}" fill="url(#terminal-bar-grad)" />
        <circle cx="24" cy="23" r="6" fill="#FF5F56" />
        <circle cx="44" cy="23" r="6" fill="#FFBD2E" />
        <circle cx="64" cy="23" r="6" fill="#27C93F" />
        
        <!-- Live Neon Pill -->
        <rect x="84" y="13" width="94" height="20" rx="10" fill="#00FF88" fill-opacity="0.15" stroke="#00FF88" stroke-width="1" />
        <circle cx="96" cy="23" r="3.5" fill="#00FF88" />
        <text x="106" y="27" font-family="monospace" font-size="11" font-weight="bold" fill="#00FF88">TRENDING</text>

        <!-- Repo Path & Star Count -->
        <text x="${this.windowW / 2}" y="29" font-family="monospace" font-size="14" font-weight="bold" fill="#58A6FF" text-anchor="middle">
          github.com/${repoName} • ★ ${starCount} stars
        </text>

        <!-- Section Label -->
        <text x="${this.windowW - 24}" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#8B949E" text-anchor="end">
          ${sectionLabel}
        </text>

        <!-- Glowing Neon Border -->
        <rect x="2" y="2" width="${this.windowW - 4}" height="${this.windowH - 4}" rx="22" fill="none" stroke="#00E5FF" stroke-width="3" stroke-opacity="0.75" />
      </svg>
    `;
  }

  /**
   * Pre-render CRT Frame and Rounded Mask assets
   */
  async prepareCRTAssets(outputDir, repoName, starCount, sectionLabel = 'LIVE DEMO') {
    await fs.mkdir(outputDir, { recursive: true });
    const crtOverlayPath = path.join(outputDir, `crt_overlay_${Math.random().toString(36).substring(2, 7)}.png`);
    const cardMaskPath = path.join(outputDir, `card_mask_${Math.random().toString(36).substring(2, 7)}.png`);

    const crtSvg = this.generateCRTOverlaySVG(repoName, starCount, sectionLabel);
    const maskSvg = `<svg width="${this.windowW}" height="${this.windowH}"><rect x="0" y="0" width="${this.windowW}" height="${this.windowH}" rx="22" ry="22" fill="#fff"/></svg>`;

    await sharp(Buffer.from(crtSvg)).png().toFile(crtOverlayPath);
    await sharp(Buffer.from(maskSvg)).png().toFile(cardMaskPath);

    return { crtOverlayPath, cardMaskPath };
  }

  /**
   * Prepare resized full-page screenshot matching card content width
   */
  async prepareResizedFullPage(fullPageScreenshotPath, outputDir) {
    const contentW = this.windowW;
    const destPath = path.join(outputDir, 'full_page_resized.png');
    await sharp(fullPageScreenshotPath)
      .resize(contentW, null, { fit: 'fill' })
      .png()
      .toFile(destPath);

    const meta = await sharp(destPath).metadata();
    return { resizedPath: destPath, totalHeight: meta.height };
  }

  /**
   * Render MagicAnimate 3D Perspective + Smooth Continuous Page Scroll Clip
   * 
   * @param {Object} params
   * @param {string} params.fullPageResizedPath - Resized full page image path
   * @param {string} params.outputMp4Path - Destination video clip path
   * @param {number} params.duration - Clip duration in seconds
   * @param {string} params.repoName - Repository name (e.g. 'owner/repo')
   * @param {string} params.starCount - Stars count (e.g. '17.3k')
   * @param {string} params.sectionLabel - Section label text
   * @param {number} params.startY - Starting vertical scroll offset in px
   * @param {number} params.scrollDistance - Number of vertical px to smoothly scroll down
   * @param {string} params.perspectiveStyle - 'isometric_right' | 'isometric_left' | 'forward_pitch'
   */
  async renderMagicAnimateScrollClip({
    fullPageResizedPath,
    outputMp4Path,
    duration = 3.5,
    repoName,
    starCount,
    sectionLabel = 'LIVE DEMO',
    startY = 0,
    scrollDistance = 750,
    perspectiveStyle = 'isometric_right'
  }) {
    const tempDir = path.join(path.dirname(outputMp4Path), 'temp_crt');
    const { crtOverlayPath, cardMaskPath } = await this.prepareCRTAssets(tempDir, repoName, starCount, sectionLabel);

    const contentW = this.windowW;
    const contentH = this.windowH - this.headerH;

    // 3D Perspective Presets (MagicAnimate Style)
    let perspectiveCoords;
    if (perspectiveStyle === 'isometric_right') {
      perspectiveCoords = {
        x0: 270, y0: 120,
        x1: 1650, y1: 165,
        x2: 230, y2: 915,
        x3: 1610, y3: 960
      };
    } else if (perspectiveStyle === 'isometric_left') {
      perspectiveCoords = {
        x0: 270, y0: 165,
        x1: 1650, y1: 120,
        x2: 310, y2: 960,
        x3: 1690, y3: 915
      };
    } else {
      // forward_pitch (symmetrical 3D depth)
      perspectiveCoords = {
        x0: 280, y0: 130,
        x1: 1640, y1: 130,
        x2: 240, y2: 950,
        x3: 1680, y3: 950
      };
    }

    // FFmpeg Filter Graph:
    // 1. Loop 4K background video
    // 2. Smooth cubic scroll down the full page image: startY + scrollDistance * (1 - cos(PI*t/D)) / 2
    // 3. Attach top terminal header bar and CRT overlay with rounded alpha mask
    // 4. Center on 1920x1080 canvas and apply 3D perspective transform with sense=destination
    // 5. Generate soft deep drop shadow and composite over background
    const filterGraph = `
      [0:v]trim=0:${duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg];
      [1:v]format=yuva420p,
           crop=${contentW}:${contentH}:0:'${startY} + ${scrollDistance} * (1 - cos(PI*t/${duration})) / 2'[scrolling_content];
      [scrolling_content]pad=${this.windowW}:${this.windowH}:0:${this.headerH}:color=black@0[scrolling_pad];
      [scrolling_pad][2:v]overlay=0:0[raw_card];
      [raw_card][3:v]alphamerge[masked_card];
      [masked_card]pad=1920:1080:(1920-${this.windowW})/2:(1080-${this.windowH})/2:color=black@0[canvas_card];
      [canvas_card]perspective=
         x0=${perspectiveCoords.x0}:y0=${perspectiveCoords.y0}:
         x1=${perspectiveCoords.x1}:y1=${perspectiveCoords.y1}:
         x2=${perspectiveCoords.x2}:y2=${perspectiveCoords.y2}:
         x3=${perspectiveCoords.x3}:y3=${perspectiveCoords.y3}:
         sense=destination:
         interpolation=cubic[card_3d];
      [card_3d]split[card_front][card_for_shadow];
      [card_for_shadow]format=yuva420p,colorchannelmixer=aa=0.60:rr=0:gg=0:bb=0,gblur=sigma=35[shadow];
      [bg][shadow]overlay=25:35[bg_with_shadow];
      [bg_with_shadow][card_front]overlay=0:0[outv]
    `;

    const cmd = `ffmpeg -y -loglevel error \
      -stream_loop -1 -i "${this.bgVideo}" \
      -f image2 -loop 1 -i "${fullPageResizedPath}" \
      -f image2 -loop 1 -i "${crtOverlayPath}" \
      -f image2 -loop 1 -i "${cardMaskPath}" \
      -t ${duration} \
      -filter_complex "${filterGraph.replace(/\s+/g, ' ')}" \
      -map "[outv]" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputMp4Path}"`;

    await safeExec(cmd);
    return outputMp4Path;
  }

  /**
   * Render Cinematic Full-Screen 3D Pan & Tilt GitHub Reveal Clip
   */
  async renderFullScreen3DPanTiltClip({
    fullPageResizedPath,
    outputMp4Path,
    duration = 3.5,
    repoName,
    starCount,
    sectionLabel = 'GITHUB TRENDING SPOTLIGHT',
    startY = 0,
    scrollDistance = 650
  }) {
    await fs.mkdir(path.dirname(outputMp4Path), { recursive: true });
    const tempDir = path.join(path.dirname(outputMp4Path), 'temp_fs_crt');
    await fs.mkdir(tempDir, { recursive: true });

    const fsWidth = 1920;
    const fsHeight = 1080;
    const fsHeaderH = 52;
    const fsContentH = fsHeight - fsHeaderH;

    // Full-screen CRT Frame & Overlay SVG
    const fsCrtSvg = `
      <svg width="${fsWidth}" height="${fsHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="fs-scanlines" width="100%" height="3" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="${fsWidth}" y2="0" stroke="#000000" stroke-width="1.3" opacity="0.30" />
          </pattern>
          <pattern id="fs-lattice" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="2" height="2" fill="#00FFCC" opacity="0.05" />
            <rect x="2" y="0" width="2" height="2" fill="#FF0055" opacity="0.04" />
            <rect x="4" y="0" width="2" height="2" fill="#0088FF" opacity="0.05" />
          </pattern>
          <radialGradient id="fs-glass" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.02" />
            <stop offset="70%" stop-color="#000000" stop-opacity="0.10" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.65" />
          </radialGradient>
          <linearGradient id="fs-bar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#090D14" stop-opacity="0.98" />
            <stop offset="50%" stop-color="#111927" stop-opacity="0.98" />
            <stop offset="100%" stop-color="#090D14" stop-opacity="0.98" />
          </linearGradient>
        </defs>

        <rect y="${fsHeaderH}" width="${fsWidth}" height="${fsContentH}" fill="url(#fs-lattice)" />
        <rect y="${fsHeaderH}" width="${fsWidth}" height="${fsContentH}" fill="url(#fs-scanlines)" />
        <rect y="${fsHeaderH}" width="${fsWidth}" height="${fsContentH}" fill="url(#fs-glass)" />

        <rect x="0" y="0" width="${fsWidth}" height="${fsHeaderH}" fill="url(#fs-bar)" />
        <circle cx="28" cy="26" r="7" fill="#FF5F56" />
        <circle cx="50" cy="26" r="7" fill="#FFBD2E" />
        <circle cx="72" cy="26" r="7" fill="#27C93F" />

        <rect x="96" y="15" width="102" height="22" rx="11" fill="#00FF88" fill-opacity="0.15" stroke="#00FF88" stroke-width="1.2" />
        <circle cx="110" cy="26" r="4" fill="#00FF88" />
        <text x="120" y="30" font-family="monospace" font-size="12" font-weight="bold" fill="#00FF88">TRENDING</text>

        <text x="${fsWidth / 2}" y="32" font-family="monospace" font-size="16" font-weight="bold" fill="#58A6FF" text-anchor="middle">
          github.com/${repoName} • ★ ${starCount} stars
        </text>

        <text x="${fsWidth - 28}" y="32" font-family="monospace" font-size="13" font-weight="bold" fill="#8B949E" text-anchor="end">
          ${sectionLabel}
        </text>

        <rect x="2" y="2" width="${fsWidth - 4}" height="${fsHeight - 4}" fill="none" stroke="#00E5FF" stroke-width="3" stroke-opacity="0.8" />
      </svg>
    `;

    const fsOverlayPath = path.join(tempDir, `fs_overlay_${Date.now()}.png`);
    await sharp(Buffer.from(fsCrtSvg)).png().toFile(fsOverlayPath);

    // Scale full page screenshot to 1920px width
    const fsResizedPath = path.join(tempDir, `fs_resized_${Date.now()}.png`);
    await sharp(fullPageResizedPath)
      .resize(fsWidth, null, { fit: 'fill' })
      .png()
      .toFile(fsResizedPath);

    // 3D Cinematic Dynamic Tilt & Pan Motion Filter Graph (Silky smooth 60fps render)
    const filterGraph = `
      [0:v]trim=0:${duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg];
      [1:v]format=yuva420p,
           crop=${fsWidth}:${fsContentH}:0:'${startY} + ${scrollDistance} * (1 - cos(PI*t/${duration})) / 2'[scrolling_content];
      [scrolling_content]pad=${fsWidth}:${fsHeight}:0:${fsHeaderH}:color=black@0[scrolling_pad];
      [scrolling_pad][2:v]overlay=0:0[raw_card];
      [raw_card]perspective=
         x0=28:y0=0:
         x1=1892:y1=22:
         x2=0:y2=1080:
         x3=1920:y3=1058:
         sense=destination:
         interpolation=cubic[card_3d];
      [card_3d]split[card_front][card_for_shadow];
      [card_for_shadow]format=yuva420p,colorchannelmixer=aa=0.45:rr=0:gg=0:bb=0,gblur=sigma=30[shadow];
      [bg][shadow]overlay=14:18[bg_with_shadow];
      [bg_with_shadow][card_front]overlay=0:0[outv]
    `;

    const cmd = `ffmpeg -y -loglevel error \
      -stream_loop -1 -i "${this.bgVideo}" \
      -f image2 -loop 1 -i "${fsResizedPath}" \
      -f image2 -loop 1 -i "${fsOverlayPath}" \
      -t ${duration} \
      -filter_complex "${filterGraph.replace(/\s+/g, ' ')}" \
      -map "[outv]" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputMp4Path}"`;

    await safeExec(cmd);
    return outputMp4Path;
  }
}

module.exports = { GitHubCardRenderer };
