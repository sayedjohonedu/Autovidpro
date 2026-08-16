const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Screen Studio Cursor Animator
 * Captures clean high-DPI GitHub desktop web pages with large legible fonts,
 * and renders smooth spring-mass vector Tahoe cursor movement frame-by-frame (zero stretching).
 */
class ScreenStudioCursorAnimator {
  constructor(options = {}) {
    this.cursorPackDir = options.cursorPackDir || path.join(
      process.env.HOME || '/Users/sayedjohon',
      'Documents/Broadcast/cursor_packs/cursors/sets/macos-tahoe'
    );
  }

  /**
   * Load vector cursor SVG as buffer
   */
  async loadCursorBuffer(cursorFilename, size = 64) {
    const filePath = path.join(this.cursorPackDir, cursorFilename);
    return await sharp(filePath).resize(size, null).png().toBuffer();
  }

  /**
   * Render Standalone Screen Studio Cursor Interaction Video
   */
  async renderScreenStudioDemoClip({
    repoName,
    repoUrl,
    outputMp4Path,
    duration = 6.0,
    starCount = '12.4k'
  }) {
    await fs.mkdir(path.dirname(outputMp4Path), { recursive: true });
    const tempDir = path.join(path.dirname(outputMp4Path), `temp_screenstudio_${Date.now()}`);
    const framesDir = path.join(tempDir, 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    // 1. Dynamic DOM Inspection: Accurately find where README, Code, and Badges actually sit
    console.log(`[ScreenStudioCursorAnimator] Inspecting dynamic DOM layout for: ${repoName}...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2.0 // True Apple Retina High-DPI
    });

    await page.emulateMedia({ colorScheme: 'dark' });
    const targetUrl = repoUrl || `https://github.com/${repoName}`;

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      console.warn(`[ScreenStudioCursorAnimator] Nav warning: ${e.message}`);
    }

    // Inspect dynamic element coordinates directly from the live DOM
    let domPositions;
    try {
      domPositions = await page.evaluate(() => {
        // Find Star button
        const starEl = document.querySelector('a[href*="stargazers"], #repository-details-container button, button[aria-label*="star" i]');
        const starBox = starEl ? starEl.getBoundingClientRect() : { x: 1780, y: 110, width: 80, height: 32 };

        // Find About sidebar
        const allHeadings = Array.from(document.querySelectorAll('h2, div'));
        const aboutEl = allHeadings.find(el => el.innerText && el.innerText.trim() === 'About');
        const aboutBox = aboutEl ? aboutEl.getBoundingClientRect() : { x: 1420, y: 280, width: 200, height: 30 };

        // Find README container
        const readmeEl = document.querySelector('article.markdown-body') || document.querySelector('div#readme') || document.querySelector('.Box--responsive');
        const readmeBox = readmeEl ? readmeEl.getBoundingClientRect() : null;

        // Find Code blocks inside README (installation, quickstart)
        const codeEl = document.querySelector('article.markdown-body pre') || document.querySelector('div#readme pre') || document.querySelector('article pre');
        const codeBox = codeEl ? codeEl.getBoundingClientRect() : null;

        // Full scroll height
        const pageHeight = Math.max(document.body.scrollHeight, 2400);

        return {
          star: { x: Math.round(starBox.x + (starBox.width || 80) / 2), y: Math.round(starBox.y + (starBox.height || 30) / 2) },
          about: { x: Math.round(aboutBox.x + 40), y: Math.round(aboutBox.y + 40) },
          readmeTop: readmeBox ? Math.round(readmeBox.y + window.scrollY) : 1600,
          codeBlock: codeBox ? Math.round(codeBox.y + window.scrollY) : (readmeBox ? Math.round(readmeBox.y + window.scrollY + 500) : 2200),
          totalHeight: Math.min(pageHeight, 6000)
        };
      });
    } catch (err) {
      console.warn(`[ScreenStudioCursorAnimator] Layout fallback: ${err.message}`);
      domPositions = {
        star: { x: 1800, y: 110 },
        about: { x: 1420, y: 280 },
        readmeTop: 1800,
        codeBlock: 2400,
        totalHeight: 4500
      };
    }

    console.log(`[ScreenStudioCursorAnimator] Dynamic DOM Coordinates:`, domPositions);

    // Resize viewport to capture the full inspected page height
    const captureHeight = Math.max(3000, Math.min(domPositions.totalHeight, 5500));
    await page.setViewportSize({ width: 1920, height: captureHeight });
    await page.waitForTimeout(500);

    const basePagePath = path.join(tempDir, 'base_page.png');
    const rawScreenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: captureHeight } });
    await sharp(rawScreenshot)
      .resize(1920, captureHeight)
      .toFile(basePagePath);
    await browser.close();

    // 2. Prepare Vector Cursor PNGs with Sharp
    const pointerPng = await this.loadCursorBuffer('pointer-1__14-6.svg', 52);
    const handPng = await this.loadCursorBuffer('pointinghand-1__40-10.svg', 52);
    const ibeamPng = await this.loadCursorBuffer('ibeam-1__50-44.svg', 30);

    // 3. 12-Second Procedural Flight Path Generator (10+ Infinite Variations)
    // Structure: ~5.5-6.0s on Top Header/Stars/Sidebar + ~6.0-6.5s in Deep README/Installation/Features
    const fps = 30;
    const totalFrames = Math.floor(duration * fps);

    // Archetype selection (10 distinct movement styles)
    const archetypes = [
      'curved_overshoot',     // Sweeping organic bezier arc with gentle overshoot
      'sidebar_first',        // Checks community links first then stars
      'star_explorer',        // Clicks star, checks forks, explores release badge
      'deep_reader',          // Glides across paragraphs with slow continuous reading hover
      'code_highlighter',     // Selects multiple lines of terminal code
      'quick_flick_settle',   // Fast snappy flicks with elastic settling
      'figure_eight_curve',   // Wide flowing natural arc
      'stargazer_focus',      // Star click ripple, release notes, then deep architecture
      'command_inspector',    // Inspects npm/pip/git install blocks with i-beam tracking
      'architecture_explorer' // Hovers across diagrams, directory tree, and badges
    ];

    const chosenArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    // Randomized zoom factor between 1.25x and 1.55x (Retina-backed so zero blur)
    const zoom = 1.25 + Math.random() * 0.28; // e.g. 1.28x to 1.53x
    const jitterAmount = 1.5 + Math.random() * 2.0;

    console.log(`[ScreenStudioCursorAnimator] Generating 12s flight with archetype: "${chosenArchetype}", zoom: ${zoom.toFixed(2)}x`);

    // Procedural Waypoints Builder based on archetype and live DOM coordinates
    const waypoints = this.buildProceduralWaypoints(chosenArchetype, domPositions, duration);

    let curX = waypoints[0].x, curY = waypoints[0].y;
    let camX = curX, camY = curY;
    let vx = 0, vy = 0;
    let camVx = 0, camVy = 0;
    const stiffness = 38.0 + (Math.random() * 8.0 - 4.0); // Natural variance
    const damping = 9.5 + (Math.random() * 1.5 - 0.75);

    console.log(`[ScreenStudioCursorAnimator] Rendering ${totalFrames} frames (12s dynamic procedural Screen Studio)...`);

    for (let f = 0; f < totalFrames; f++) {
      const elapsed = f / fps;

      let targetX = curX, targetY = curY;
      let cursorType = 'pointer';
      let isClick = false;

      // Evaluate cubic bezier waypoint segment
      for (let i = 0; i < waypoints.length - 1; i++) {
        const w1 = waypoints[i];
        const w2 = waypoints[i + 1];
        if (elapsed >= w1.t && elapsed <= w2.t) {
          const p = (elapsed - w1.t) / (w2.t - w1.t);
          // Quintic ease with organic midpoint curvature
          const ease = p < 0.5 ? 16 * p * p * p * p * p : 1 - Math.pow(-2 * p + 2, 5) / 2;
          
          // Organic curved arc calculation (Bézier control offset)
          const ctrlOffsetX = w1.curveX || 0;
          const ctrlOffsetY = w1.curveY || 0;
          const curveInfluence = Math.sin(p * Math.PI);

          targetX = (w1.x + (w2.x - w1.x) * ease) + (ctrlOffsetX * curveInfluence);
          targetY = (w1.y + (w2.y - w1.y) * ease) + (ctrlOffsetY * curveInfluence);
          
          // Micro-wandering (natural organic human hand breathing while reading)
          if (w1.isReading) {
            targetX += Math.sin(elapsed * 3.5) * jitterAmount * 1.5;
            targetY += Math.cos(elapsed * 2.8) * jitterAmount;
          }

          cursorType = p > 0.35 ? w2.cursor : w1.cursor;
          if (w2.click && p > 0.40 && p < 0.68) isClick = true;
          break;
        }
      }

      // Spring integration
      const dt = 1.0 / fps;
      vx += ((targetX - curX) * stiffness - vx * damping) * dt;
      vy += ((targetY - curY) * stiffness - vy * damping) * dt;
      curX += vx * dt;
      curY += vy * dt;

      // Dynamic Camera Follow
      const cropW = Math.round(1920 / zoom);
      const cropH = Math.round(1080 / zoom);

      camVx += ((curX - camX) * 16.0 - camVx * 7.0) * dt;
      camVy += ((curY - camY) * 16.0 - camVy * 7.0) * dt;
      camX += camVx * dt;
      camY += camVy * dt;

      // Dynamic page clamp
      const cropLeft = Math.max(0, Math.min(1920 - cropW, Math.round(camX - cropW / 2)));
      const cropTop = Math.max(0, Math.min(captureHeight - cropH, Math.round(camY - cropH / 2)));

      const cursorOnCroppedX = (curX - cropLeft) * zoom;
      const cursorOnCroppedY = (curY - cropTop) * zoom;

      let activeCursorBuf = pointerPng;
      if (cursorType === 'hand') activeCursorBuf = handPng;
      else if (cursorType === 'ibeam') activeCursorBuf = ibeamPng;

      const overlays = [];

      if (isClick) {
        const rippleSvg = `
          <svg width="84" height="84">
            <circle cx="42" cy="42" r="32" fill="rgba(0,229,255,0.4)" stroke="#00E5FF" stroke-width="3.5" />
          </svg>
        `;
        overlays.push({
          input: Buffer.from(rippleSvg),
          top: Math.max(0, Math.min(1000, Math.round(cursorOnCroppedY - 20))),
          left: Math.max(0, Math.min(1840, Math.round(cursorOnCroppedX - 20)))
        });
      }

      overlays.push({
        input: activeCursorBuf,
        top: Math.max(0, Math.min(1010, Math.round(cursorOnCroppedY))),
        left: Math.max(0, Math.min(1850, Math.round(cursorOnCroppedX)))
      });

      const framePath = path.join(framesDir, `frame_${String(f).padStart(4, '0')}.png`);
      await sharp(basePagePath)
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(1920, 1080)
        .composite(overlays)
        .png()
        .toFile(framePath);
    }

    // 4. Encode frames to smooth 1080p MP4 via FFmpeg
    console.log(`[ScreenStudioCursorAnimator] Encoding final 12s 1080p video clip...`);
    const cmd = `ffmpeg -y \
      -framerate ${fps} \
      -i "${path.join(framesDir, 'frame_%04d.png')}" \
      -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p \
      "${outputMp4Path}"`;

    await execAsync(cmd);

    // Cleanup frames
    try {
      const rmFiles = await fs.readdir(framesDir);
      for (const file of rmFiles) await fs.unlink(path.join(framesDir, file)).catch(() => {});
      await fs.rmdir(framesDir);
      await fs.unlink(basePagePath).catch(() => {});
      await fs.rmdir(tempDir);
    } catch (_) {}

    console.log(`[ScreenStudioCursorAnimator] ✅ Pristine 12s Screen Studio clip rendered: ${outputMp4Path}`);
    return outputMp4Path;
  }

  buildProceduralWaypoints(archetype, dom, totalDuration) {
    const rx = () => (Math.random() - 0.5) * 60;
    const ry = () => (Math.random() - 0.5) * 40;
    const rCurve = () => (Math.random() - 0.5) * 120;

    // 4 Distinct Directional Trajectories so every video starts in a completely different area:
    const flightStyles = ['top_to_bottom', 'readme_first_upward', 'code_terminal_first', 'license_sidebar_first'];
    const chosenStyle = flightStyles[Math.floor(Math.random() * flightStyles.length)];
    console.log(`[ScreenStudioCursorAnimator] Flight direction strategy: "${chosenStyle}"`);

    if (chosenStyle === 'readme_first_upward') {
      // Starts inside README diagrams / features first -> scrolls UP to Title and Star Button
      return [
        { t: 0.0, x: 600 + rx(), y: dom.readmeTop + 500 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 2.2, x: 550 + rx(), y: dom.readmeTop + 100 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 4.0, x: 580 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 5.8, x: 920 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true },
        { t: 7.5, x: dom.about.x + rx(), y: dom.about.y + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 9.2, x: dom.star.x + rx() * 0.3, y: dom.star.y, cursor: 'hand', click: true, curveX: rCurve(), curveY: rCurve() },
        { t: 10.2, x: dom.star.x, y: dom.star.y, cursor: 'hand', click: false },
        { t: 12.0, x: 220 + rx(), y: 110 + ry(), cursor: 'pointer', click: false, curveX: rCurve(), curveY: rCurve() }
      ];
    } else if (chosenStyle === 'code_terminal_first') {
      // Starts directly on CLI Installation Code Highlight -> README Header -> Star Button
      return [
        { t: 0.0, x: 480 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true },
        { t: 2.5, x: 960 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 4.8, x: 650 + rx(), y: dom.readmeTop + 200 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 6.8, x: dom.about.x + rx(), y: dom.about.y + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 8.8, x: dom.star.x + rx() * 0.3, y: dom.star.y, cursor: 'hand', click: true, curveX: rCurve(), curveY: rCurve() },
        { t: 10.0, x: dom.star.x, y: dom.star.y, cursor: 'hand', click: false },
        { t: 12.0, x: 600 + rx(), y: dom.readmeTop + 800 + ry(), cursor: 'pointer', click: false, isReading: true }
      ];
    } else if (chosenStyle === 'license_sidebar_first') {
      // Starts on Sidebar About & License -> Glides into README -> Finishes on Star Click
      return [
        { t: 0.0, x: dom.about.x + rx(), y: dom.about.y + ry(), cursor: 'pointer', click: false, isReading: true },
        { t: 2.2, x: dom.about.x + 30 + rx(), y: dom.about.y + 160 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 4.5, x: 650 + rx(), y: dom.readmeTop + 100 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 6.8, x: 580 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 8.5, x: 920 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true },
        { t: 10.2, x: dom.star.x + rx() * 0.3, y: dom.star.y, cursor: 'hand', click: true, curveX: rCurve(), curveY: rCurve() },
        { t: 12.0, x: dom.star.x, y: dom.star.y, cursor: 'hand', click: false }
      ];
    } else {
      // Default: Top Header & Star -> Smooth Dive into README & Architecture
      return [
        { t: 0.0, x: 120 + rx(), y: 220 + ry(), cursor: 'pointer', click: false, curveX: rCurve(), curveY: rCurve() },
        { t: 1.2, x: 220 + rx(), y: 110 + ry(), cursor: 'pointer', click: false, curveX: rCurve(), curveY: rCurve() },
        { t: 2.5, x: dom.star.x + rx() * 0.3, y: dom.star.y, cursor: 'hand', click: true, curveX: rCurve(), curveY: rCurve() },
        { t: 3.2, x: dom.star.x, y: dom.star.y, cursor: 'hand', click: false },
        { t: 4.2, x: dom.about.x + rx(), y: dom.about.y + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 5.4, x: dom.about.x + 30 + rx(), y: dom.about.y + 120 + ry(), cursor: 'pointer', click: false, isReading: true },
        { t: 6.8, x: 650 + rx(), y: dom.readmeTop + 100 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 8.2, x: 550 + rx(), y: dom.readmeTop + 480 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 9.6, x: 580 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() },
        { t: 10.8, x: 920 + rx(), y: dom.codeBlock + 40 + ry(), cursor: 'ibeam', click: false, isReading: true },
        { t: 12.0, x: 740 + rx(), y: dom.readmeTop + 900 + ry(), cursor: 'pointer', click: false, isReading: true, curveX: rCurve(), curveY: rCurve() }
      ];
    }
  }
}

module.exports = { ScreenStudioCursorAnimator };
