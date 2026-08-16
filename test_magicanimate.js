const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testMagicAnimateScroll() {
  console.log('🚀 Testing MagicAnimate-Style 3D Perspective & Smooth Page Scroll...');

  const outputDir = path.join(process.cwd(), 'data', 'test_magicanimate');
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Capture Full Page Screenshot (1440x4500)
  const fullPagePath = path.join(outputDir, 'full_page.png');
  console.log('📸 Capturing tall full page screenshot with Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 4200 },
    deviceScaleFactor: 1.5
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('https://github.com/cathrynlavery/diagram-design', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: fullPagePath, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 4200 } });
  await browser.close();

  // 2. Build 3D Window Frame & Overlay (1280 x 720 for crisp floating card)
  const windowW = 1280;
  const windowH = 720;
  const headerH = 46;
  const contentW = windowW;
  const contentH = windowH - headerH;

  const crtSvg = `
    <svg width="${windowW}" height="${windowH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Horizontal CRT Scanlines -->
        <pattern id="crt-scanlines" width="100%" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="${windowW}" y2="0" stroke="#000000" stroke-width="1.2" opacity="0.30" />
        </pattern>

        <!-- RGB Phosphor Dot Grid -->
        <pattern id="pixel-lattice" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill="#00FFCC" opacity="0.05" />
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

      <!-- Scanlines & Lattice over screen -->
      <rect y="${headerH}" width="${windowW}" height="${contentH}" fill="url(#pixel-lattice)" />
      <rect y="${headerH}" width="${windowW}" height="${contentH}" fill="url(#crt-scanlines)" />
      <rect y="${headerH}" width="${windowW}" height="${contentH}" fill="url(#crt-glass-glow)" />

      <!-- Top Window Bar -->
      <rect x="0" y="0" width="${windowW}" height="${headerH}" fill="url(#terminal-bar-grad)" />
      <circle cx="24" cy="23" r="6" fill="#FF5F56" />
      <circle cx="44" cy="23" r="6" fill="#FFBD2E" />
      <circle cx="64" cy="23" r="6" fill="#27C93F" />
      
      <!-- Live Neon Pill -->
      <rect x="84" y="13" width="94" height="20" rx="10" fill="#00FF88" fill-opacity="0.15" stroke="#00FF88" stroke-width="1" />
      <circle cx="96" cy="23" r="3.5" fill="#00FF88" />
      <text x="106" y="27" font-family="monospace" font-size="11" font-weight="bold" fill="#00FF88">TRENDING</text>

      <!-- Title & Star Count -->
      <text x="${windowW / 2}" y="29" font-family="monospace" font-size="14" font-weight="bold" fill="#58A6FF" text-anchor="middle">
        github.com/cathrynlavery/diagram-design • ★ 17,365 stars
      </text>

      <!-- Section Label -->
      <text x="${windowW - 24}" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#8B949E" text-anchor="end">
        LIVE DEMO
      </text>

      <!-- Glowing Neon Border -->
      <rect x="2" y="2" width="${windowW - 4}" height="${windowH - 4}" rx="20" fill="none" stroke="#00E5FF" stroke-width="3" stroke-opacity="0.7" />
    </svg>
  `;

  const crtOverlayPath = path.join(outputDir, 'crt_overlay.png');
  const cardMaskPath = path.join(outputDir, 'card_mask.png');

  await sharp(Buffer.from(crtSvg)).png().toFile(crtOverlayPath);
  await sharp(Buffer.from(`<svg width="${windowW}" height="${windowH}"><rect x="0" y="0" width="${windowW}" height="${windowH}" rx="20" ry="20" fill="#fff"/></svg>`)).png().toFile(cardMaskPath);

  // Resize full page screenshot width to contentW
  const fullPageResizedPath = path.join(outputDir, 'full_page_resized.png');
  await sharp(fullPagePath)
    .resize(contentW, null, { fit: 'fill' })
    .png()
    .toFile(fullPageResizedPath);

  const { height: resizedH } = await sharp(fullPageResizedPath).metadata();
  console.log(`✅ Full page scaled to width ${contentW}px (Total height: ${resizedH}px)`);

  const duration = 4.0;
  const bgVideo = path.join(process.cwd(), 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4');
  const outputMp4 = path.join(outputDir, 'test_magicanimate_scroll.mp4');

  const startScrollY = 0;
  const scrollDistance = 850; // smooth scroll 850px down the page

  // MagicAnimate 3D Perspective Preset:
  // Isometric angled tilt with depth:
  // Card 1280x720 centered on 1920x1080 canvas
  // Base center: x=320, y=180
  //
  // 3D Isometric Coordinates on 1920x1080 plane:
  // Top-Left:     (380, 160)
  // Top-Right:    (1580, 200)
  // Bottom-Left:  (300, 860)
  // Bottom-Right: (1520, 920)

  const filterGraph = `
    [0:v]trim=0:${duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg];
    [1:v]format=yuva420p,
         crop=${contentW}:${contentH}:0:'${startScrollY} + ${scrollDistance} * (1 - cos(PI*t/${duration})) / 2'[scrolling_content];
    [scrolling_content]pad=${windowW}:${windowH}:0:${headerH}:color=black@0[scrolling_pad];
    [scrolling_pad][2:v]overlay=0:0[raw_card];
    [raw_card][3:v]alphamerge[masked_card];
    [masked_card]pad=1920:1080:(1920-${windowW})/2:(1080-${windowH})/2:color=black@0[canvas_card];
    [canvas_card]perspective=
       x0=360:y0=140:
       x1=1560:y1=180:
       x2=320:y2=880:
       x3=1520:y3=920:
       sense=destination:
       interpolation=cubic[card_3d];
    [card_3d]split[card_front][card_for_shadow];
    [card_for_shadow]format=yuva420p,colorchannelmixer=aa=0.60:rr=0:gg=0:bb=0,gblur=sigma=35[shadow];
    [bg][shadow]overlay=25:35[bg_with_shadow];
    [bg_with_shadow][card_front]overlay=0:0[outv]
  `;

  const cmd = `ffmpeg -y \
    -stream_loop -1 -i "${bgVideo}" \
    -loop 1 -i "${fullPageResizedPath}" \
    -loop 1 -i "${crtOverlayPath}" \
    -loop 1 -i "${cardMaskPath}" \
    -t ${duration} \
    -filter_complex "${filterGraph.replace(/\s+/g, ' ')}" \
    -map "[outv]" \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${outputMp4}"`;

  console.log('🎬 Rendering MagicAnimate 3D Isometric Perspective + Page Scroll video...');
  await execAsync(cmd);
  console.log(`🎉 Done! Saved to: ${outputMp4}`);

  // Extract 3 snapshots to verify scrolling progression across time
  await execAsync(`ffmpeg -y -ss 00:00:00.5 -i "${outputMp4}" -vframes 1 "${path.join(outputDir, 'snap_05s.png')}"`);
  await execAsync(`ffmpeg -y -ss 00:00:02.0 -i "${outputMp4}" -vframes 1 "${path.join(outputDir, 'snap_20s.png')}"`);
  await execAsync(`ffmpeg -y -ss 00:00:03.5 -i "${outputMp4}" -vframes 1 "${path.join(outputDir, 'snap_35s.png')}"`);
}

testMagicAnimateScroll().catch(console.error);
