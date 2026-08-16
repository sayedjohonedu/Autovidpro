const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

class WebImageFetcher {
  constructor(options = {}) {
    this.usedUrls = new Set();
  }

  async searchWebImages(query, limit = 8) {
    try {
      const cleanQuery = encodeURIComponent(query.trim());
      // DuckDuckGo direct image search token & endpoint
      const tokenUrl = `https://duckduckgo.com/?q=${cleanQuery}&iax=images&ia=images`;
      const tokenRes = await axios.get(tokenUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });

      const vqdMatch = tokenRes.data.match(/vqd=([^&"']+)/) || tokenRes.data.match(/vqd:\s*"([^"]+)"/);
      if (!vqdMatch) return [];

      const vqd = vqdMatch[1];
      const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${cleanQuery}&vqd=${vqd}&f=,,,type:photo,&p=1`;

      const searchRes = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        timeout: 6000
      });

      const results = searchRes.data.results || [];
      const imageUrls = [];

      for (const item of results) {
        const imgUrl = item.image;
        if (imgUrl && !this.usedUrls.has(imgUrl) && (imgUrl.endsWith('.jpg') || imgUrl.endsWith('.png') || imgUrl.endsWith('.jpeg') || imgUrl.endsWith('.webp'))) {
          imageUrls.push(imgUrl);
          if (imageUrls.length >= limit) break;
        }
      }

      return imageUrls;
    } catch (err) {
      console.warn(`[WebImageFetcher] Web search failed for "${query}": ${err.message}`);
      return [];
    }
  }

  async fetchWebImage(query, outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const urls = await this.searchWebImages(query, 5);

    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.length > 5000) {
          await fs.writeFile(outputPath, Buffer.from(response.data));
          this.usedUrls.add(url);
          console.log(`[WebImageFetcher] ✅ Web image saved: ${outputPath}`);
          return outputPath;
        }
      } catch (e) {
        // Try next candidate URL
      }
    }

    // Fallback: Generate clean high-contrast SVG graphic if network blocked
    const fallbackSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b1329"/>
            <stop offset="100%" stop-color="#162c55"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <circle cx="640" cy="360" r="180" fill="#00E5FF" fill-opacity="0.08" stroke="#00E5FF" stroke-width="2"/>
        <text x="640" y="370" font-family="sans-serif" font-size="32" font-weight="bold" fill="#00E5FF" text-anchor="middle">${query.toUpperCase()}</text>
      </svg>
    `;
    const sharp = require('sharp');
    await sharp(Buffer.from(fallbackSvg)).png().toFile(outputPath);
    return outputPath;
  }
}

module.exports = { WebImageFetcher };
