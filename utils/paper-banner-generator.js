const path = require('path');
const sharp = require('sharp');
const fs = require('fs/promises');

class PaperBannerGenerator {
  constructor() {
    this.messages = [
      {
        text: 'Helpful? Smash Subscribe!',
        highlight: 'Subscribe',
        icon: 'bell',
        color: '#EF4444',
        bgColor: '#181C24'
      },
      {
        text: 'Drop your thoughts in Comments!',
        highlight: 'Comments',
        icon: 'chat',
        color: '#3B82F6',
        bgColor: '#181C24'
      },
      {
        text: 'Found this cool? Leave a Like!',
        highlight: 'Like',
        icon: 'thumbsup',
        color: '#F59E0B',
        bgColor: '#181C24'
      },
      {
        text: 'Star this repo on GitHub!',
        highlight: 'Star',
        icon: 'star',
        color: '#EAB308',
        bgColor: '#181C24'
      },
      {
        text: 'Share with fellow developers!',
        highlight: 'Share',
        icon: 'rocket',
        color: '#10B981',
        bgColor: '#181C24'
      },
      {
        text: 'Full repo link in description!',
        highlight: 'link',
        icon: 'link',
        color: '#8B5CF6',
        bgColor: '#181C24'
      }
    ];
  }

  /**
   * Vector icon SVG paths for 100% crisp cross-platform rendering
   */
  getIconSvg(iconName, color) {
    switch (iconName) {
      case 'bell':
        return `<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="${color}"/>`;
      case 'chat':
        return `<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="${color}"/>`;
      case 'thumbsup':
        return `<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" fill="${color}"/>`;
      case 'star':
        return `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="${color}"/>`;
      case 'rocket':
        return `<path d="M12 2.5s-4.5 4.5-4.5 9.5c0 2.5 1.5 4.5 4.5 5.5 3-1 4.5-3 4.5-5.5 0-5-4.5-9.5-4.5-9.5zm-5 13c-1.5.5-3 2-3 4.5h3v-4.5zm10 0v4.5h3c0-2.5-1.5-4-3-4.5z" fill="${color}"/>`;
      case 'link':
        return `<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="${color}"/>`;
      default:
        return `<circle cx="12" cy="12" r="8" fill="${color}"/>`;
    }
  }

  /**
   * Get random or indexed message
   */
  getMessage(index = null) {
    if (index === null || index === undefined) {
      const randIdx = Math.floor(Math.random() * this.messages.length);
      return { ...this.messages[randIdx], index: randIdx };
    }
    const safeIdx = Math.abs(index) % this.messages.length;
    return { ...this.messages[safeIdx], index: safeIdx };
  }

  /**
   * Generate an SVG paper cut sticker banner
   */
  generateBannerSvg({ text, icon = 'bell', color = '#EF4444', width = 520, height = 96 }) {
    const iconSvg = this.getIconSvg(icon, color);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="paperShadow" x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000000" flood-opacity="0.50"/>
          </filter>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E232B"/>
            <stop offset="100%" stop-color="#11141A"/>
          </linearGradient>
        </defs>

        <g filter="url(#paperShadow)">
          <!-- White Paper Cut Border -->
          <rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="20" ry="20" 
                fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.5" />
          
          <!-- Inner Dark Matte Card -->
          <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="16" ry="16" 
                fill="url(#cardGrad)" />
          
          <!-- Left Color Accent Stripe -->
          <rect x="16" y="18" width="6" height="${height - 36}" rx="3" fill="${color}" />
          
          <!-- Icon Round Badge -->
          <circle cx="56" cy="${height / 2}" r="22" fill="#242B35" stroke="${color}" stroke-width="2" />
          <g transform="translate(${56 - 12}, ${height / 2 - 12})">
            ${iconSvg}
          </g>

          <!-- Text Content -->
          <text x="92" y="${height / 2 + 7}" 
                font-family="Arial, Helvetica, sans-serif" 
                font-size="21" font-weight="bold" fill="#F8FAFC">
            ${text}
          </text>
        </g>
      </svg>
    `.trim();
  }

  /**
   * Render banner to PNG file via Sharp
   */
  async renderBannerPng({ outputPath, messageIndex = null, width = 540, height = 100 }) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const msg = this.getMessage(messageIndex);
    const svg = this.generateBannerSvg({
      text: msg.text,
      icon: msg.icon,
      color: msg.color,
      width,
      height
    });

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    return { outputPath, message: msg, width, height };
  }
}

module.exports = { PaperBannerGenerator };
