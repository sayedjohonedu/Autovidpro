const axios = require('axios');
const { chromium } = require('playwright');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: true });
const ipv4HttpAgent = new http.Agent({ family: 4, keepAlive: true });

const sharp = require('sharp');

class GitHubRepoInspector {
  constructor(options = {}) {
    this.timeout = options.timeout || 15000;
  }

  /**
   * Fetch README raw markdown from GitHub
   */
  async fetchReadme(repoPath) {
    const branches = ['main', 'master'];
    for (const branch of branches) {
      try {
        const url = `https://raw.githubusercontent.com/${repoPath}/${branch}/README.md`;
        const res = await axios.get(url, {
          timeout: 8000,
          httpsAgent: ipv4HttpsAgent,
          httpAgent: ipv4HttpAgent,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.data) return { content: res.data, branch };
      } catch (e) {
        // Try next branch
      }
    }
    return { content: '', branch: 'main' };
  }

  /**
   * Harvest image and GIF URLs embedded in the README
   */
  extractReadmeMedia(readmeText, repoPath, branch = 'main') {
    const mediaUrls = [];
    // Match Markdown images: ![alt](url)
    const mdImgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+|\.[^\s\)]+)\)/g;
    // Match HTML images/video tags: <img src="url">
    const htmlImgRegex = /<(?:img|video|source)[^>]*?src=["']([^"']+)["']/gi;

    const allMatches = [
      ...readmeText.matchAll(mdImgRegex),
      ...readmeText.matchAll(htmlImgRegex)
    ];

    for (const match of allMatches) {
      let rawUrl = match[1];
      if (!rawUrl) continue;

      // Filter out badges, shields, license SVGs, small logos, and single-letter app icons
      const lower = rawUrl.toLowerCase();
      if (
        lower.includes('badge') ||
        lower.includes('shields.io') ||
        lower.includes('workflow/status') ||
        lower.includes('travis-ci') ||
        lower.includes('circleci') ||
        lower.includes('codecov') ||
        lower.includes('logo') ||
        lower.includes('favicon') ||
        lower.includes('icon') ||
        lower.includes('avatar')
      ) {
        continue;
      }

      // Convert relative paths to raw GitHub CDN URLs
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        mediaUrls.push(rawUrl);
      } else if (rawUrl.startsWith('./') || !rawUrl.startsWith('/')) {
        const cleanPath = rawUrl.replace(/^\.\//, '');
        mediaUrls.push(`https://raw.githubusercontent.com/${repoPath}/${branch}/${cleanPath}`);
      } else if (rawUrl.startsWith('/')) {
        mediaUrls.push(`https://raw.githubusercontent.com/${repoPath}/${branch}${rawUrl}`);
      }
    }

    return [...new Set(mediaUrls)];
  }

  /**
   * Download harvested README media files (auto-rasterizes SVGs to high-DPI PNGs)
   */
  async downloadReadmeMedia(mediaUrls, outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    const downloaded = [];

    for (let idx = 0; idx < Math.min(mediaUrls.length, 6); idx++) {
      const url = mediaUrls[idx];
      try {
        const ext = (path.extname(url.split('?')[0]) || '.png').toLowerCase();
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          httpsAgent: ipv4HttpsAgent,
          httpAgent: ipv4HttpAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        const buf = Buffer.from(response.data);
        const isSvg = ext === '.svg' || buf.toString('utf8', 0, 100).includes('<svg');

        if (isSvg) {
          const pngDest = path.join(outputDir, `readme_media_${idx}.png`);
          await sharp(buf, { density: 300 }).png().toFile(pngDest);
          downloaded.push(pngDest);
          console.log(`[GitHubRepoInspector] ✅ Rasterized SVG to high-res PNG [${idx + 1}/${mediaUrls.length}]: ${path.basename(url)}`);
        } else {
          // Normalize and verify through sharp before saving
          const destPath = path.join(outputDir, `readme_media_${idx}.png`);
          try {
            await sharp(buf).png().toFile(destPath);
            downloaded.push(destPath);
            console.log(`[GitHubRepoInspector] ✅ Verified and saved image [${idx + 1}/${mediaUrls.length}]: ${path.basename(url)}`);
          } catch (sharpErr) {
            console.warn(`[GitHubRepoInspector] Skipping unsupported/corrupted image ${url}: ${sharpErr.message}`);
          }
        }
      } catch (err) {
        console.warn(`[GitHubRepoInspector] Could not download README media ${url}: ${err.message}`);
      }
    }
    return downloaded;
  }

  /**
   * Discover and harvest author demo assets (GIFs, MP4s, PNGs) from repo trees
   */
  async discoverRepoAssets(repoPath, outputDir, branch = 'main') {
    await fs.mkdir(outputDir, { recursive: true });
    const discoveredUrls = [];

    // Check GitHub Public Trees API (no token required)
    try {
      const treeUrl = `https://api.github.com/repos/${repoPath}/git/trees/${branch}?recursive=1`;
      const res = await axios.get(treeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 6000
      });

      const tree = res.data?.tree || [];
      const mediaExtensions = ['.gif', '.mp4', '.webm', '.png', '.jpg', '.jpeg'];
      const targetFolders = ['assets', 'doc', 'docs', 'media', 'images', 'img', 'demo', 'screenshots', 'static'];

      for (const node of tree) {
        if (node.type === 'blob') {
          const lowerPath = node.path.toLowerCase();
          const ext = path.extname(lowerPath);
          const inTargetFolder = targetFolders.some(f => lowerPath.includes(`/${f}/`) || lowerPath.startsWith(`${f}/`));

          if (mediaExtensions.includes(ext) && (inTargetFolder || ext === '.gif' || ext === '.mp4')) {
            // Ignore small icons or badges
            if (!lowerPath.includes('badge') && !lowerPath.includes('icon') && !lowerPath.includes('logo') && !lowerPath.includes('favicon')) {
              discoveredUrls.push(`https://raw.githubusercontent.com/${repoPath}/${branch}/${node.path}`);
              if (discoveredUrls.length >= 6) break;
            }
          }
        }
      }
    } catch (err) {
      // Tree API rate limited, continue
    }

    if (discoveredUrls.length > 0) {
      console.log(`[GitHubRepoInspector] 📦 Discovered ${discoveredUrls.length} author demo files in repo tree`);
      const downloaded = await this.downloadReadmeMedia(discoveredUrls, outputDir);
      return downloaded;
    }

    return [];
  }

  /**
   * Playwright capture: Takes tall single full-page screenshot for smooth continuous 3D scrolling
   */
  async captureFullPageScreenshot(repoPath, outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    const fullPagePath = path.join(outputDir, 'full_page_tall.png');

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    if (process.platform === 'linux' && fsSync.existsSync('/usr/bin/google-chrome')) {
      launchOptions.executablePath = '/usr/bin/google-chrome';
    }
    const browser = await chromium.launch(launchOptions);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 4200 },
      deviceScaleFactor: 2.0
    });

    await page.emulateMedia({ colorScheme: 'dark' });
    const repoUrl = `https://github.com/${repoPath}`;
    console.log(`[GitHubRepoInspector] Navigating to ${repoUrl} for high-legibility desktop capture...`);

    await page.goto(repoUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout });
    await page.addStyleTag({
      content: `
        .Header, .AppHeader, footer, #repos-sticky-header { display: none !important; }
        .markdown-body { font-size: 20px !important; line-height: 1.7 !important; }
        .markdown-body h1 { font-size: 34px !important; font-weight: 800 !important; }
        .markdown-body h2 { font-size: 28px !important; font-weight: 700 !important; }
        .markdown-body pre { font-size: 17px !important; }
      `
    });
    await page.waitForTimeout(1400);

    await page.screenshot({
      path: fullPagePath,
      clip: { x: 0, y: 0, width: 1440, height: 4200 }
    });

    // Capture focused repository UI sections for repos without images
    const sectionPaths = [];
    try {
      const codeTree = await page.locator('table[aria-labelledby="folders-and-files"], div.js-details-container').first();
      if (await codeTree.count() > 0) {
        const p = path.join(outputDir, 'section_codetree.png');
        await codeTree.screenshot({ path: p });
        sectionPaths.push(p);
      }

      const installBlock = await page.locator('pre, div.highlight').first();
      if (await installBlock.count() > 0) {
        const p = path.join(outputDir, 'section_install.png');
        await installBlock.screenshot({ path: p });
        sectionPaths.push(p);
      }

      const sidebar = await page.locator('div.Layout-sidebar').first();
      if (await sidebar.count() > 0) {
        const p = path.join(outputDir, 'section_sidebar.png');
        await sidebar.screenshot({ path: p });
        sectionPaths.push(p);
      }
    } catch (e) {
      // Ignore section capture errors
    }

    await browser.close();
    console.log(`[GitHubRepoInspector] Successfully captured tall full-page + ${sectionPaths.length} focused section cards!`);
    return { fullPagePath, sectionPaths };
  }
}

module.exports = { GitHubRepoInspector };
