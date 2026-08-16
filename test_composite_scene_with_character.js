const path = require('path');
const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testSceneComposite() {
  const animator = new CharacterCutoutAnimator();
  const outputDir = path.join(__dirname, 'data', 'test_character');
  const baseScene = path.join(__dirname, 'data', 'videos', 'compilation_1786773439295', 'segment_01_cathrynlavery_diagram-design', 'scene_5_stitched.mp4');
  const overlayVideo = path.join(outputDir, 'char_pop_scene5.mp4');
  const finalDemo = path.join(outputDir, 'scene_with_paper_character.mp4');

  console.log('Rendering character reaction overlay for Scene 5 (CTA Star)...');
  await animator.renderPaperCutPopOverlay({
    outputPath: overlayVideo,
    duration: 3.5,
    poseIndex: 0, // Laughing / cheering celebration pose
    corner: 'bottom_right',
    scale: 0.82
  });

  const cmd = `ffmpeg -y \
    -i "${baseScene}" \
    -i "${overlayVideo}" \
    -filter_complex "[0:v][1:v]overlay=0:0[outv]" \
    -map "[outv]" -map 0:a \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
    -c:a copy \
    "${finalDemo}"`;

  await execAsync(cmd);
  console.log(`🎉 Final Scene Composite Complete: ${finalDemo}`);

  // Extract a preview frame at 1.8s
  const framePath = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', 'b4c38779-b917-4f87-b5c4-89a6b26c2d48', 'scene_character_pop_preview.png');
  await execAsync(`ffmpeg -y -ss 1.8 -i "${finalDemo}" -vframes 1 -update 1 "${framePath}"`);
  console.log(`📸 Preview Frame: ${framePath}`);
}

testSceneComposite().catch(console.error);
