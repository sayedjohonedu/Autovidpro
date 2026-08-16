const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

class SubtitleRenderer {
  /**
   * Splits narration into rhythmic 4-6 word chunks and renders sequential subtitle PNGs
   */
  async renderTimedSubtitleChunks(text, totalDuration, outputDir, sceneNum) {
    await fs.mkdir(outputDir, { recursive: true });

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunkWordCount = 5;
    const rawChunks = [];

    for (let i = 0; i < words.length; i += chunkWordCount) {
      rawChunks.push(words.slice(i, i + chunkWordCount));
    }

    if (rawChunks.length === 0) return [];

    const chunkDuration = totalDuration / rawChunks.length;
    const chunkInfos = [];

    for (let cIdx = 0; cIdx < rawChunks.length; cIdx++) {
      const chunkWords = rawChunks[cIdx];
      const start = cIdx * chunkDuration;
      const end = (cIdx + 1) * chunkDuration;
      const pngPath = path.join(outputDir, `sub_s${sceneNum}_c${cIdx}.png`);

      // Highlight key words (uppercase words, numbers, or center word)
      const highlightedWords = chunkWords.map((w, wIdx) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '');
        if (clean === clean.toUpperCase() && clean.length >= 2) {
          return `<tspan fill="#FFE600" font-weight="900">${w}</tspan>`;
        }
        if (wIdx === Math.floor(chunkWords.length / 2) && chunkWords.length > 2) {
          return `<tspan fill="#FFE600" font-weight="900">${w}</tspan>`;
        }
        return w;
      });

      const formattedText = highlightedWords.join(' ');

      const svg = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
        </defs>
        <style>
          .sub-text {
            font-family: 'Helvetica Neue', 'Arial Black', -apple-system, sans-serif;
            font-size: 38px;
            font-weight: 800;
            fill: #FFFFFF;
            text-anchor: middle;
            letter-spacing: 0.5px;
          }
        </style>
        <g filter="url(#pillShadow)">
          <rect x="360" y="945" width="1200" height="76" rx="38" fill="black" fill-opacity="0.8" stroke="white" stroke-width="2" stroke-opacity="0.25"/>
          <text x="960" y="998" class="sub-text">${formattedText}</text>
        </g>
      </svg>`;

      await sharp(Buffer.from(svg)).png().toFile(pngPath);

      chunkInfos.push({
        pngPath,
        start,
        end
      });
    }

    return chunkInfos;
  }
}

module.exports = { SubtitleRenderer };
