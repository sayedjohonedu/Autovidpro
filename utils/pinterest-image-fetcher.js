const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

class PinterestImageFetcher {
  constructor(options = {}) {
    this.usedUrls = new Set();
    this.stockBlacklist = [
      'dreamstime.com',
      'shutterstock.com',
      'gettyimages.com',
      'alamy.com',
      'istockphoto.com',
      'depositphotos.com',
      '123rf.com',
      'adobe.com',
      'freepik.com',
      'vectorstock.com',
      'canva.com',
      'unsplash.com',
      'plus.unsplash.com'
    ];
  }

  isBlacklisted(url) {
    const lower = (url || '').toLowerCase();
    return this.stockBlacklist.some(domain => lower.includes(domain));
  }

  /**
   * Search Pinterest and aesthetic design channels for high-res unwatermarked visuals
   */
  async searchPinterestImages(query, limit = 8) {
    const cleanQuery = encodeURIComponent(`${query.trim()} aesthetic wallpaper 4k design`);
    const results = [];

    // Method 1: Pinterest public search endpoint via axios
    try {
      const pinterestSearchUrl = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${cleanQuery}&data=%7B%22options%22%3A%7B%22query%22%3A%22${cleanQuery}%22%2C%22scope%22%3A%22pins%22%7D%2C%22context%22%3A%7B%7D%7D`;
      
      const pinRes = await axios.get(pinterestSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        timeout: 6000
      });

      const pinItems = pinRes.data?.resource_response?.data?.results || [];
      for (const item of pinItems) {
        // Look for 736x or original pin images
        const imagesObj = item.images;
        if (imagesObj) {
          const bestImg = imagesObj.orig?.url || imagesObj['736x']?.url || imagesObj['564x']?.url;
          if (bestImg && !this.isBlacklisted(bestImg) && !this.usedUrls.has(bestImg)) {
            results.push(bestImg);
            if (results.length >= limit) return results;
          }
        }
      }
    } catch (e) {
      // Fall through to DuckDuckGo Pinterest filter
    }

    // Method 2: DuckDuckGo targeted Pinterest & Artstation scraper
    try {
      const targetQuery = encodeURIComponent(`site:pinterest.com/pin/ OR site:artstation.com ${query.trim()} aesthetic 4k`);
      const tokenUrl = `https://duckduckgo.com/?q=${targetQuery}&iax=images&ia=images`;
      const tokenRes = await axios.get(tokenUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 5000
      });

      const vqdMatch = tokenRes.data.match(/vqd=([^&"']+)/) || tokenRes.data.match(/vqd:\s*"([^"]+)"/);
      if (vqdMatch) {
        const vqd = vqdMatch[1];
        const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${targetQuery}&vqd=${vqd}&p=1`;
        const searchRes = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://duckduckgo.com/'
          },
          timeout: 6000
        });

        const items = searchRes.data.results || [];
        for (const item of items) {
          const imgUrl = item.image;
          if (imgUrl && !this.isBlacklisted(imgUrl) && !this.usedUrls.has(imgUrl)) {
            results.push(imgUrl);
            if (results.length >= limit) return results;
          }
        }
      }
    } catch (e) {
      // Fall through to aesthetic Unsplash fallback
    }

    // Method 3: Unsplash curated high-res photography
    if (results.length < limit) {
      try {
        const unsplashUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=6`;
        const uRes = await axios.get(unsplashUrl, { timeout: 5000 });
        const uItems = uRes.data?.results || [];
        for (const item of uItems) {
          const uImg = item.urls?.regular || item.urls?.full;
          if (uImg && !this.usedUrls.has(uImg)) {
            results.push(uImg);
            if (results.length >= limit) return results;
          }
        }
      } catch (e) {}
    }

    return results;
  }

  /**
   * Fetch and save high-resolution aesthetic image
   */
  async fetchAestheticImage(query, outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const urls = await this.searchPinterestImages(query, 6);

    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.length > 10000) {
          await fs.writeFile(outputPath, Buffer.from(response.data));
          this.usedUrls.add(url);
          console.log(`[PinterestImageFetcher] ✅ Aesthetic image saved: ${outputPath} (${path.basename(url)})`);
          return outputPath;
        }
      } catch (e) {}
    }

    // Fallback: Elegant Cyberpunk Vector Card
    const fallbackSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#070A10"/>
            <stop offset="100%" stop-color="#111B2E"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <rect x="40" y="40" width="1200" height="640" rx="16" fill="none" stroke="#00E5FF" stroke-width="2" stroke-opacity="0.3"/>
        <circle cx="640" cy="360" r="160" fill="#00FF88" fill-opacity="0.06" stroke="#00FF88" stroke-width="1.5"/>
        <text x="640" y="370" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" fill="#00E5FF" text-anchor="middle" letter-spacing="2">
          ${query.toUpperCase()}
        </text>
      </svg>
    `;
    await sharp(Buffer.from(fallbackSvg)).png().toFile(outputPath);
    return outputPath;
  }
}

module.exports = { PinterestImageFetcher };
