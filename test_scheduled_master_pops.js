const path = require('path');
const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testScheduledPops() {
  console.log('🎬 Testing Scheduled Master Video Pop-ins (Every 25-35s)...');
  const animator = new CharacterCutoutAnimator();

  // Create a 60-second test video clip from master compilation
  const baseMaster = path.join(__dirname, 'data', 'videos', 'compilation_1786773439295', 'master_compilation_3_repos_1080p.mp4');
  const testInput = path.join(__dirname, 'data', 'test_character', 'input_60s_sample.mp4');
  const testOutput = path.join(__dirname, 'data', 'test_character', 'output_60s_with_scheduled_pops.mp4');

  await execAsync(`ffmpeg -y -ss 0 -i "${baseMaster}" -t 60 -c copy "${testInput}"`);
  console.log(`Extracted 60s test slice: ${testInput}`);

  await animator.applyPeriodicPopsToMaster({
    inputVideo: testInput,
    outputVideo: testOutput,
    intervalSeconds: 25,
    initialOffset: 12
  });

  console.log(`🎉 Test Completed! Output: ${testOutput}`);

  // Extract preview frame at t = 14.5s (Pop 1) and t = 39.5s (Pop 2)
  const frame1 = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', 'b4c38779-b917-4f87-b5c4-89a6b26c2d48', 'scheduled_pop_01.png');
  const frame2 = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', 'b4c38779-b917-4f87-b5c4-89a6b26c2d48', 'scheduled_pop_02.png');

  await execAsync(`ffmpeg -y -ss 14.2 -i "${testOutput}" -vframes 1 -update 1 "${frame1}"`);
  await execAsync(`ffmpeg -y -ss 39.2 -i "${testOutput}" -vframes 1 -update 1 "${frame2}"`);
  console.log(`📸 Extracted preview frames:\n  - ${frame1}\n  - ${frame2}`);
}

testScheduledPops().catch(console.error);
