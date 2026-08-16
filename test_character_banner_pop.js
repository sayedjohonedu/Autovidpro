const path = require('path');
const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testCompletePop() {
  console.log('🎬 Testing Character + Behind-the-Character Banner Pop-in...');
  const animator = new CharacterCutoutAnimator();
  const outputDir = path.join(__dirname, 'data', 'test_character');
  const standaloneVideo = path.join(outputDir, 'standalone_pop_with_banner.mp4');

  const res = await animator.renderCompletePaperCutPop({
    outputPath: standaloneVideo,
    duration: 4.0,
    poseIndex: 0, // Laughing celebration pose
    messageIndex: 0, // "Helpful? Smash Subscribe!"
    corner: 'bottom_right',
    scale: 0.78
  });

  console.log(`✅ Standalone Pop Rendered: ${res.outputPath}`);

  // Now test compositing onto an actual video scene
  const baseScene = path.join(__dirname, 'data', 'videos', 'compilation_1786773439295', 'master_compilation_3_repos_1080p.mp4');
  const compositedVideo = path.join(outputDir, 'master_with_pop_demo.mp4');

  console.log('Compositing timed pop onto master video at 22.0s...');
  await animator.compositePopOntoVideo({
    inputVideo: baseScene,
    outputVideo: compositedVideo,
    startOffsetSec: 22.0,
    poseIndex: 1, // Kiss / love hearts
    messageIndex: 2, // "Found this cool? Leave a Like!"
    corner: 'bottom_right',
    duration: 4.0
  });

  console.log(`🎉 Master Video with Timed Pop Ready: ${compositedVideo}`);

  // Extract preview frame at t = 24.0s (when character and banner are fully unfolded)
  const framePath = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', 'b4c38779-b917-4f87-b5c4-89a6b26c2d48', 'character_banner_pop_preview.png');
  await execAsync(`ffmpeg -y -ss 24.0 -i "${compositedVideo}" -vframes 1 -update 1 "${framePath}"`);
  console.log(`📸 Preview Frame Extracted: ${framePath}`);
}

testCompletePop().catch(console.error);
