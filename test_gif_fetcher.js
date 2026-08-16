import GIFMotionFetcher from './utils/gif-motion-fetcher.js';
import path from 'path';

async function test() {
  console.log('Testing Multi-Source GIF & Motion Fetcher...');
  const fetcher = new GIFMotionFetcher();

  const queries = ['robot chess', 'mind blown space', 'thinking funny'];
  for (const q of queries) {
    console.log(`\n--- Searching: "${q}" ---`);
    const results = await fetcher.searchMediaLoop(q, { limit: 3 });
    console.log(`Results count: ${results.length}`);
    if (results.length > 0) {
      console.log(`Top result [${results[0].source}]: ${results[0].title}`);
      console.log(`URL: ${results[0].videoUrl}`);

      const testDownloadPath = path.join(process.cwd(), 'data', 'cache', 'gifs', `test_${q.replace(/\s+/g, '_')}.mp4`);
      await fetcher.downloadClip(results[0].videoUrl, testDownloadPath);
      console.log(`✅ Downloaded successfully to: ${testDownloadPath}`);
    }
  }
}

test().catch(console.error);
