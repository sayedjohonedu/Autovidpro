const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { CuratedGIFLibrary } = require('./curated-gif-library');

class SimpleLogger {
  info(msg) { console.log(`[GIFMotionFetcher] [INFO] ${msg}`); }
  warn(msg) { console.warn(`[GIFMotionFetcher] [WARN] ${msg}`); }
  error(msg) { console.error(`[GIFMotionFetcher] [ERROR] ${msg}`); }
}

class GIFMotionFetcher {
  constructor(options = {}) {
    this.logger = new SimpleLogger();
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'data', 'cache', 'gifs');
    this.dbPath = path.join(process.cwd(), 'data', 'cache', 'gif_history_db.json');
    this.tenorApiKey = process.env.TENOR_API_KEY || '';
    this.giphyApiKey = process.env.GIPHY_API_KEY || '';
    this.curatedLib = new CuratedGIFLibrary(options);
    this.sessionUsedUrls = new Set(); // Strict session deduplication
    this.globalUsedHistory = [];
    this.initCache();
  }

  async initCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const raw = await fs.readFile(this.dbPath, 'utf8').catch(() => '[]');
      this.globalUsedHistory = JSON.parse(raw);
    } catch (e) {
      this.globalUsedHistory = [];
    }
  }

  async saveHistory(url) {
    try {
      this.globalUsedHistory.push({ url, timestamp: Date.now() });
      if (this.globalUsedHistory.length > 500) {
        this.globalUsedHistory = this.globalUsedHistory.slice(-500);
      }
      await fs.writeFile(this.dbPath, JSON.stringify(this.globalUsedHistory, null, 2), 'utf8');
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Reset duplicate tracking for new production
   */
  resetUsedClips() {
    this.sessionUsedUrls.clear();
    this.curatedLib.resetSession();
  }

  /**
   * Refine and simplify query into punchy, movie/pop-culture search terms
   */
  refineQuery(rawQuery) {
    let q = rawQuery
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/animation|loop|motion graphics|conceptual technology|futuristic/gi, '')
      .replace(/labeled\s+['"][^'"]+['"]/gi, '')
      .replace(/[^\w\s-]/g, ' ')
      .trim();

    const words = q.split(/\s+/).filter(w => w.length > 1);
    const keywords = words.slice(0, 4).join(' ');
    return keywords || rawQuery;
  }

  /**
   * Scrape Tenor web directly for high quality movie, TV, and pop culture GIFs
   */
  async searchTenorWeb(query, limit = 15) {
    try {
      const cleanSlug = encodeURIComponent(query.toLowerCase()).replace(/%20/g, '-');
      const url = `https://tenor.com/search/${cleanSlug}-gifs`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 7000
      });

      const matches = [...res.data.matchAll(/https:\/\/media\.tenor\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.gif/g)];
      const urls = [...new Set(matches.map(m => m[0]))];

      return urls.slice(0, limit).map((mediaUrl, idx) => ({
        id: `tenor_web_${idx}_${Date.now()}`,
        source: 'tenor_web',
        title: query,
        videoUrl: mediaUrl,
        gifUrl: mediaUrl
      }));
    } catch (err) {
      this.logger.warn(`Tenor Web search failed for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Universal Web GIF Search (GIPHY, Reddit, Gifer, Imgur, KnowYourMeme via DDG)
   */
  async searchUniversalGIFs(query, limit = 15) {
    try {
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query + ' gif')}&iax=images&ia=images`;
      const tokenRes = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 7000
      });

      const vqdMatch = tokenRes.data.match(/vqd=([0-9-]+)/) || tokenRes.data.match(/vqd="([0-9-]+)"/);
      if (!vqdMatch) return [];

      const vqd = vqdMatch[1];
      const dataUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query + ' gif')}&vqd=${vqd}&f=,,,type:gif`;
      
      const imgRes = await axios.get(dataUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        timeout: 7000
      });

      const results = (imgRes.data?.results || []).slice(0, limit);
      return results.map((item, idx) => ({
        id: `ddg_gif_${idx}_${Date.now()}`,
        source: 'universal_web',
        title: item.title || query,
        videoUrl: item.image,
        gifUrl: item.image,
        width: item.width || 480,
        height: item.height || 480
      }));
    } catch (err) {
      this.logger.warn(`Universal GIF search failed for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Search for animated GIFs and looping clips across all integrated engines
   */
  async searchMediaLoop(query, options = {}) {
    const limit = options.limit || 15;
    const refined = this.refineQuery(query);
    this.logger.info(`Searching motion loops for: "${refined}" (raw: "${query}")...`);

    // 1. First priority: Tenor Direct Scraper
    const tenorResults = await this.searchTenorWeb(refined, limit);
    if (tenorResults.length > 0) {
      this.logger.info(`Found ${tenorResults.length} Tenor clips for "${refined}"`);
      return tenorResults;
    }

    // 2. Second priority: Universal Web Search
    const webResults = await this.searchUniversalGIFs(refined, limit);
    if (webResults.length > 0) {
      this.logger.info(`Found ${webResults.length} Universal clips for "${refined}"`);
      return webResults;
    }

    // 3. Fallback: Search with original raw query
    const fallbackResults = await this.searchUniversalGIFs(query, limit);
    return fallbackResults;
  }

  /**
   * Download a media clip with timeout and stream verification
   */
  async downloadClip(mediaUrl, outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const response = await axios({
      method: 'get',
      url: mediaUrl,
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error ${response.status}`);
    }

    await fs.writeFile(outputPath, Buffer.from(response.data));
    return outputPath;
  }

  /**
   * High-level helper: Fetch matching motion GIF
   * PRIORITY 1: Curated Local GIF Library (0 latency, perfectly relevant, zero duplicate loops)
   * PRIORITY 2: Tenor / Web Fallback (if no local match found)
   */
  async fetchMotionLoop(query, outputPath, options = {}) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 1. Check Curated Local Library
    const localMatch = this.curatedLib.getBestMatch(query, options);
    if (localMatch.success && localMatch.path) {
      await fs.copyFile(localMatch.path, outputPath);
      const title = localMatch.item.displayTitle || localMatch.item.title || localMatch.item.filename;
      this.logger.info(`✨ Curated Local GIF match (${localMatch.source}): "${title}" (${localMatch.item.filename})`);
      return outputPath;
    }

    this.logger.info(`No local match for "${query}". Falling back to online web search...`);

    // 2. Online search fallback
    const results = await this.searchMediaLoop(query, { limit: 15 });
    if (!results || results.length === 0) {
      // If web fails, pick any relevant category from curated library
      const forcedLocal = this.curatedLib.getBestMatch(query, { threshold: 0.1 });
      if (forcedLocal.success) {
        await fs.copyFile(forcedLocal.path, outputPath);
        this.logger.info(`✅ Curated Library Fallback: "${forcedLocal.item.title}"`);
        return outputPath;
      }
      throw new Error(`No motion loops found for query: ${query}`);
    }

    // Fisher-Yates random shuffle on results
    const shuffled = [...results];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const recentHistoryUrls = new Set(this.globalUsedHistory.map(h => h.url));
    let lastError = null;

    // Pass 1: Unused in recent history
    for (const clip of shuffled) {
      const targetUrl = clip.videoUrl || clip.gifUrl;
      if (!targetUrl) continue;

      if (this.sessionUsedUrls.has(targetUrl) || recentHistoryUrls.has(targetUrl)) {
        continue;
      }

      try {
        await this.downloadClip(targetUrl, outputPath);
        this.sessionUsedUrls.add(targetUrl);
        await this.saveHistory(targetUrl);
        this.logger.info(`✅ Web GIF acquired from ${clip.source}: ${targetUrl.substring(0, 60)}...`);
        return outputPath;
      } catch (err) {
        lastError = err;
      }
    }

    // Pass 2: Fallback to any unused in current session
    for (const clip of shuffled) {
      const targetUrl = clip.videoUrl || clip.gifUrl;
      if (!targetUrl || this.sessionUsedUrls.has(targetUrl)) continue;

      try {
        await this.downloadClip(targetUrl, outputPath);
        this.sessionUsedUrls.add(targetUrl);
        await this.saveHistory(targetUrl);
        this.logger.info(`✅ Web GIF acquired (from pool) from ${clip.source}: ${targetUrl.substring(0, 60)}...`);
        return outputPath;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`All unique candidate downloads failed for query: ${query}`);
  }
}

module.exports = { GIFMotionFetcher };
