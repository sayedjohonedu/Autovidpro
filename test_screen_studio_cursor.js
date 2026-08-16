const path = require('path');
const { ScreenStudioCursorAnimator } = require('./utils/screen-studio-cursor-animator');

async function runTest() {
  console.log('🚀 [Test] Rendering Standalone Screen Studio Cursor & Camera Interaction Clip...');
  const animator = new ScreenStudioCursorAnimator();

  const previewMp4 = path.join(__dirname, 'data', 'test_screen_studio_preview.mp4');

  await animator.renderScreenStudioDemoClip({
    repoName: 'volcengine/OpenViking',
    repoUrl: 'https://github.com/volcengine/OpenViking',
    outputMp4Path: path.join(__dirname, 'data', 'test_screen_studio_preview.mp4'),
    duration: 12.0,
    starCount: '28.5k'
  });

  console.log(`\n🎉 Preview Ready at: ${previewMp4}`);
}

runTest().catch(console.error);
