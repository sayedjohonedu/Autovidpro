const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testCharacterPop() {
  console.log('🎬 Testing Character Paper-Cut Stop-Motion Pop-in...');
  const animator = new CharacterCutoutAnimator();
  const outputDir = path.join(__dirname, 'data', 'test_character');
  const overlayVideo = path.join(outputDir, 'char_overlay_alpha.mp4');
  const testComposited = path.join(outputDir, 'char_demo_composite.mp4');

  await animator.renderPaperCutPopOverlay({
    outputPath: overlayVideo,
    duration: 3.5,
    poseIndex: 1, // Kiss / hearts pose or index 0
    corner: 'bottom_right',
    scale: 0.75
  });

  console.log(`✅ Alpha Overlay rendered: ${overlayVideo}`);

  // Composite over the animated dark grid background
  const bgVideo = path.join(__dirname, 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4');
  const sfxPath = path.join(__dirname, 'Assets', 'Transitions', 'air-move.wav');

  const cmd = `ffmpeg -y \
    -stream_loop -1 -i "${bgVideo}" \
    -i "${overlayVideo}" \
    -i "${sfxPath}" \
    -t 3.5 \
    -filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]; [bg][1:v]overlay=0:0[outv]; [2:a]volume=0.40[sfx]" \
    -map "[outv]" -map "[sfx]" \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k \
    "${testComposited}"`;

  await execAsync(cmd);
  console.log(`🎉 Demo Video with Paper-Cut Pop-in Ready: ${testComposited}`);

  // Extract a preview frame at 1.5s
  const framePath = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', 'b4c38779-b917-4f87-b5c4-89a6b26c2d48', 'character_pop_preview.png');
  await execAsync(`ffmpeg -y -ss 1.5 -i "${testComposited}" -vframes 1 -update 1 "${framePath}"`);
  console.log(`📸 Preview Frame: ${framePath}`);
}

testCharacterPop().catch(err => {
  console.error('Error testing character pop:', err);
});
