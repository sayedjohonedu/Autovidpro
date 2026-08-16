const path = require('path');
const fs = require('fs');
const { GitHubTrendingScraper } = require('./utils/github-trending-scraper');

async function runTest() {
  console.log('🧪 Testing 15-day Cooldown & Frequency Decay DB Logic...');
  const testDbPath = path.join(__dirname, 'data', 'test_cooldown_trending.db');
  
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const scraper = new GitHubTrendingScraper({ dbPath: testDbPath });

  // 1. Check fresh repo
  const freshStatus = await scraper.checkRepoEligibility('test-org/fresh-repo', 15);
  console.log('1. Fresh repo check:', freshStatus);
  console.assert(freshStatus.eligible === true && freshStatus.timesCovered === 0, 'Fresh repo should be eligible with 0 times covered');

  // 2. Record repo coverage (1st time)
  await scraper.recordCoveredRepo({
    repo: 'test-org/fresh-repo',
    url: 'https://github.com/test-org/fresh-repo',
    description: 'Test description',
    totalStars: '2.5k',
    starsToday: '400+',
    language: 'TypeScript',
    category: 'Global Trending'
  }, '/tmp/test_video.mp4');

  // 3. Check immediately after covering (should be in cooldown)
  const coveredImmediately = await scraper.checkRepoEligibility('test-org/fresh-repo', 15);
  console.log('2. Immediate re-check (within 15 days):', coveredImmediately);
  console.assert(coveredImmediately.eligible === false && coveredImmediately.reason === 'in_cooldown', 'Should be in cooldown');

  // 4. Simulate past 16 days ago
  await new Promise((resolve, reject) => {
    scraper.db.run(
      `UPDATE trending_repos_history SET last_covered_at = datetime('now', '-16 days') WHERE repo_name = 'test-org/fresh-repo'`,
      (err) => err ? reject(err) : resolve()
    );
  });

  const after16Days = await scraper.checkRepoEligibility('test-org/fresh-repo', 15);
  console.log('3. After 16 days check:', after16Days);
  console.assert(after16Days.eligible === true && after16Days.reason === 'cooldown_passed' && after16Days.timesCovered === 1, 'Should pass cooldown with count 1');

  // 5. Record 2nd time coverage
  await scraper.recordCoveredRepo({
    repo: 'test-org/fresh-repo',
    url: 'https://github.com/test-org/fresh-repo',
    description: 'Updated description',
    totalStars: '5.2k',
    starsToday: '800+',
    language: 'TypeScript',
    category: 'Global Trending'
  }, '/tmp/test_video_v2.mp4');

  // Check 2nd coverage count
  const after2ndCover = await scraper.checkRepoEligibility('test-org/fresh-repo', 15);
  console.log('4. After 2nd coverage recorded (immediate):', after2ndCover);
  console.assert(after2ndCover.timesCovered === 2 && after2ndCover.eligible === false, 'Count should be 2 and in cooldown');

  // Clean up test DB
  scraper.db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  console.log('✅ ALL 15-Day Cooldown & Frequency Decay Tests Passed Successfully!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
