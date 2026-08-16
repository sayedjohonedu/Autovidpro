const path = require('path');
const fs = require('fs');
const { GitHubTrendingScraper } = require('./utils/github-trending-scraper');

async function testDiscovery() {
  console.log('🔍 Testing fetchDeepUncoveredTrending with 15-day cooldown & tiering...');
  const scraper = new GitHubTrendingScraper();

  const repos = await scraper.fetchDeepUncoveredTrending({
    limit: 3,
    mode: 'trending',
    timeframe: 'daily',
    cooldownDays: 15
  });

  console.log(`✅ Discovered ${repos.length} candidates:`);
  repos.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.repo} | Stars: ${r.totalStars} | Times Covered: ${r.timesCovered} (Returning: ${r.isReturningStar})`);
  });
}

testDiscovery().catch(console.error);
