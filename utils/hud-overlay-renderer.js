const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');

class HUDOverlayRenderer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
  }

  /**
   * Generate an ultra-sleek, fancy borderless Apple Dynamic Notch with adaptive width
   * 
   * @param {Object} params
   * @param {number} params.segmentNumber - Current repo index (e.g. 1)
   * @param {number} params.totalSegments - Total repos in compilation (e.g. 5)
   * @param {string} params.hookTitle - Topic hook (e.g. 'AI AGENT OPERATING SYSTEM')
   * @param {string} params.repoName - Repository name (e.g. 'holaboss-ai/holaOS')
   * @param {string|number} params.starCount - Stars count (e.g. '7.3k')
   * @param {string} params.outputPath - Destination PNG file path
   */
  async generateTopHUDBanner({
    segmentNumber = 1,
    totalSegments = 5,
    hookTitle = 'GITHUB OPEN SOURCE TOOL',
    repoName = 'owner/repo',
    starCount = '10k',
    outputPath
  }) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const cleanHook = (hookTitle || 'GITHUB OPEN SOURCE TOOL').toUpperCase().trim();
    const segBadge = totalSegments > 1 ? `#0${segmentNumber} / 0${totalSegments}` : `REPO #0${segmentNumber}`;

    // Formatted current date (e.g. "AUG 15, 2026")
    const dateObj = new Date();
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();

    // 1. Adaptive Width calculation based on title and repo length
    const titleWidthEstimate = cleanHook.length * 20;
    const topLineWidthEstimate = (repoName.length + 26) * 12;
    const contentMaxW = Math.max(titleWidthEstimate, topLineWidthEstimate);
    const notchW = Math.min(1100, Math.max(540, contentMaxW + 120));
    const notchH = 88;
    const notchX = (this.width - notchW) / 2;
    const cornerR = 24;

    // Highlight key words in bright yellow (#FFE600)
    const hookWords = cleanHook.split(' ');
    let formattedHook = '';
    if (hookWords.length > 2) {
      const firstPart = hookWords.slice(0, -1).join(' ');
      const lastWord = hookWords.slice(-1).join(' ');
      formattedHook = `${firstPart} <tspan fill="#FFE600">${lastWord}</tspan>`;
    } else if (hookWords.length === 2) {
      formattedHook = `<tspan fill="#FFFFFF">${hookWords[0]}</tspan> <tspan fill="#FFE600">${hookWords[1]}</tspan>`;
    } else {
      formattedHook = `<tspan fill="#FFE600">${cleanHook}</tspan>`;
    }

    const svg = `
      <svg width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Deep Apple-style ambient shadow -->
          <filter id="fancyNotchShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.85"/>
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
          </filter>

          <!-- Sleek dark frosted glass fill with subtle top specular highlight -->
          <linearGradient id="fancyNotchBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#121216" stop-opacity="0.94"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
          </linearGradient>
        </defs>

        <!-- Borderless Fancy Apple Notch -->
        <g filter="url(#fancyNotchShadow)">
          <path d="
            M ${notchX} 0
            L ${notchX + notchW} 0
            L ${notchX + notchW} ${notchH - cornerR}
            Q ${notchX + notchW} ${notchH} ${notchX + notchW - cornerR} ${notchH}
            L ${notchX + cornerR} ${notchH}
            Q ${notchX} ${notchH} ${notchX} ${notchH - cornerR}
            Z
          " fill="url(#fancyNotchBg)"/>
        </g>

        <!-- Line 1: Date + Segment + GitHub Link + Star Badge -->
        <text x="${this.width / 2}" y="30" font-family="-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="0.6">
          <tspan fill="#FFE600" font-weight="800">${segBadge}</tspan>
          <tspan fill="#FFFFFF" fill-opacity="0.35">   |   </tspan>
          <tspan fill="#E2E8F0">${formattedDate}</tspan>
          <tspan fill="#FFFFFF" fill-opacity="0.35">   |   </tspan>
          <tspan fill="#94A3B8" font-family="'SF Pro Mono', Menlo, monospace">github.com/${repoName}</tspan>
          <tspan fill="#FFE600" font-weight="900"> ★ ${starCount}</tspan>
        </text>

        <!-- Line 2: Hook Title about the Repo (Large, Bold White + Yellow Accent) -->
        <text x="${this.width / 2}" y="67" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="25" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.8">
          ${formattedHook}
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    return outputPath;
  }
}

module.exports = { HUDOverlayRenderer };
