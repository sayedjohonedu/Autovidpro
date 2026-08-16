const axios = require('axios');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { Logger } = require('../utils/logger');
const { ThumbnailStudioGenerator } = require('../utils/thumbnail-studio-generator');

/**
 * High-CTR Banned AI Clichés & Grade-3 Vocabulary Sanitizer
 */
const BANNED_AI_WORDS = [
  'UNLEASHED', 'UNLEASH', 'REVOLUTIONARY', 'REVOLUTION', 'GAME CHANGER', 'GAME-CHANGER',
  'SUPERCHARGED', 'TURBOCHARGED', 'PARADIGM', 'DELVE', 'TAPESTRY', 'NEXT-GEN', 'NEXT GEN',
  'CUTTING-EDGE', 'CUTTING EDGE', 'TRANSFORMATIVE', 'DISRUPTIVE', 'DISRUPT', 'POWERHOUSE',
  'UNPARALLELED', 'GROUNDBREAKING', 'HARNESS', 'ELEVATE', 'MASTERCLASS', 'SEAMLESS',
  'BEACON', 'TESTAMENT', 'SYMPHONY', 'PIVOTAL', 'EMPOWER', 'UNPRECEDENTED', 'UNVEIL',
  'UNLOCK', 'PHENOMENAL', 'UNRIVALED', 'UNMATCHED', 'SUPERIOR', 'METICULOUS', 'EXPEDITE'
];

const GRADE_3_FALLBACKS = {
  'UNLEASHED': 'IS FREE',
  'UNLEASH': 'RUN THIS',
  'REVOLUTIONARY': 'BIG WIN',
  'GAME CHANGER': 'TOP TOOL',
  'SUPERCHARGED': 'SO FAST',
  'TURBOCHARGED': 'TOO FAST',
  'GROUNDBREAKING': 'THE BEST',
  'NEXT-GEN': 'NEW BOT',
  'NEXT GEN': 'NEW BOT',
  'CUTTING-EDGE': 'TOP TIER',
  'POWERHOUSE': 'INSANE',
  'TRANSFORMATIVE': 'INSANE',
  'DISRUPTIVE': 'KILLER APP',
  'UNLOCK': 'OPEN THIS',
  'UNVEIL': 'THE TRUTH'
};

class ThumbnailDesignerAgent {
  constructor(db, credentials = {}) {
    this.db = db;
    this.logger = new Logger('ThumbnailDesigner');
    this.studioGenerator = new ThumbnailStudioGenerator();
    this.projectId = 'newaug626';
    this.location = 'us-central1';
    this.adcPath = path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.httpsAgent = new https.Agent({ family: 4, keepAlive: true });
  }

  async initialize() {
    this.logger.info('Initializing Multi-Archetype Thumbnail Designer Agent (Grade 3 Vocabulary Engine)...');
    return true;
  }

  async getAccessToken() {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.cachedToken;
    }

    let creds = null;
    if (process.env.GCLOUD_ADC_JSON) {
      creds = JSON.parse(process.env.GCLOUD_ADC_JSON);
    } else if (fs.existsSync(this.adcPath)) {
      creds = JSON.parse(fs.readFileSync(this.adcPath, 'utf8'));
    } else {
      throw new Error(`ADC credentials not found at ${this.adcPath}`);
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    }, {
      httpsAgent: this.httpsAgent,
      timeout: 10000
    });

    this.cachedToken = response.data.access_token;
    this.tokenExpiry = Date.now() + ((response.data.expires_in || 3600) * 1000);
    return this.cachedToken;
  }

  /**
   * Deterministic Grade 3 Sanitizer: Replaces AI buzzwords with simple, high-CTR 3rd-grade English words
   */
  sanitizeHookText(hookText, mood = 'shocked') {
    if (!hookText) return 'TOP TOOL';
    let text = hookText.toUpperCase().replace(/["'’]/g, '').trim();

    // Check for explicit banned AI words
    for (const banned of BANNED_AI_WORDS) {
      if (text.includes(banned)) {
        const replacement = GRADE_3_FALLBACKS[banned] || 'TOP TOOL';
        text = text.replace(new RegExp(banned, 'g'), replacement).trim();
      }
    }

    // Split words and enforce 2 to 3 simple words maximum
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      text = words.slice(0, 3).join(' ');
    }

    // Double check if any single word is overly complex (length > 10 chars)
    const sanitizedWords = text.split(/\s+/).map(w => {
      if (w.length > 10) {
        if (mood === 'shocked' || mood === 'terrified') return 'INSANE';
        if (mood === 'secret') return 'SECRET';
        return 'NEW';
      }
      return w;
    });

    return sanitizedWords.join(' ');
  }

  /**
   * Autonomously design and generate a viral 16:9 YouTube thumbnail
   * Auto-picks the best archetype matching the repository news and video title with Grade 3 vocabulary
   */
  async generateThumbnail(repoOrScriptData, outputPath) {
    try {
      const topicName = repoOrScriptData.repo || repoOrScriptData.title || 'Trending Video';
      this.logger.info(`Devising viral thumbnail concept for: ${topicName}`);

      // 1. Ask AI Director to analyze the news/repo and auto-pick the optimal archetype + props
      const concept = await this.designConceptWithAI(repoOrScriptData);
      
      // 2. Strictly sanitize hookText to Grade 3 vocabulary (Zero AI buzzwords)
      const cleanHookText = this.sanitizeHookText(concept.hookText, concept.mood);
      this.logger.info(`Concept devised: [Archetype: ${concept.archetypeId}] Clean Hook (Grade 3): "${cleanHookText}" | Mood: ${concept.mood}`);

      // 3. Render via ThumbnailStudioGenerator (Vertex AI Nano Banana 2 / OmniRoute Antigravity)
      const finalOutputPath = outputPath || path.join(
        __dirname,
        '..',
        'uploads',
        'thumbnails',
        `thumb_${concept.archetypeId}_${(topicName).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`
      );

      const result = await this.studioGenerator.generateThumbnail({
        archetypeId: concept.archetypeId,
        hookText: cleanHookText,
        mood: concept.mood,
        customProp: concept.customProp,
        customAction: concept.customAction,
        customBackground: concept.customBackground,
        outputPath: finalOutputPath
      });

      const thumbnailData = {
        path: result.outputPath,
        archetypeId: concept.archetypeId,
        concept: {
          ...concept,
          hookText: cleanHookText
        },
        promptText: result.promptText,
        dimensions: { width: 1920, height: 1080 },
        createdAt: new Date().toISOString()
      };

      if (this.db && this.db.saveThumbnail) {
        await this.db.saveThumbnail(thumbnailData);
      }

      this.logger.info(`✅ Viral Thumbnail Generated: ${result.outputPath}`);
      return thumbnailData;
    } catch (error) {
      this.logger.error('Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * AI Visual Director: Analyzes news/topic and auto-picks the most viral thumbnail archetype
   * Strictly enforces Grade 3 reading level vocabulary and bans all generic AI words
   */
  async designConceptWithAI(repoData) {
    const repoName = repoData.repo || repoData.title || 'Trending GitHub Tool';
    const description = repoData.description || repoData.hookTitle || repoData.hookHookLine || 'Open-source software release';
    const readmeSnippet = (repoData.readmeSnippet || repoData.narration || '').substring(0, 1000);

    const promptText = `You are a world-class YouTube thumbnail creative director and high-CTR visual strategist.
Analyze this video topic / repository and auto-pick the single best thumbnail archetype to maximize YouTube click-through rate (CTR).

CRITICAL THUMBNAIL HOOK RULES (GRADE 3 READING LEVEL):
1. The hookText MUST be 2 to 3 words maximum (ALL CAPS).
2. The words MUST be ultra-simple, easily understood by an 8-year-old child or someone who speaks basic English worldwide.
3. ABSOLUTE BAN ON GENERIC AI BUZZWORDS. NEVER USE:
   - "UNLEASHED", "UNLEASH", "REVOLUTIONARY", "REVOLUTION", "GAME CHANGER", "SUPERCHARGED", "PARADIGM", "DELVE", "TAPESTRY", "NEXT-GEN", "CUTTING-EDGE", "TRANSFORMATIVE", "DISRUPT", "POWERHOUSE", "UNPARALLELED", "GROUNDBREAKING", "HARNESS", "ELEVATE", "MASTERCLASS", "SEAMLESS", "UNLOCK", "UNVEIL".
4. RECOMMENDED GRADE-3 HIGH-CTR HOOK WORDS:
   - DANGER/WARNING: "STOP!", "DON'T USE", "TOO LATE", "IT BROKE", "BAD NEWS", "NO MORE", "DEAD TOOL", "WATCH OUT"
   - COST/VALUE: "100% FREE", "ZERO COST", "SAVE MONEY", "NO FEES", "THEY HID THIS", "FREE FOREVER"
   - SPEED/POWER: "TOO FAST", "SO QUICK", "1 CLICK", "TOO EASY", "JUST WORKS", "10X SPEED", "BIG WIN"
   - SECRETS/LEAKS: "NEW BOT", "CODE LEAK", "THE TRUTH", "TRY THIS", "SECRET TOOL", "AI LEAK", "THEY LIED"
   - CONFLICT/REPLACEMENT: "OLD VS NEW", "KILL IT", "IS DEAD", "BETTER TOOL", "REPLACE THIS", "X IS GONE"

AVAILABLE THUMBNAIL ARCHETYPES:
1. "white_studio_dotgrid" -> Clean modern dev tools, official releases, sleek workflows. Large upright 3D matte-black text, tangible physical prop on white micro dot-grid floor, dominant host on right.
2. "total_chaos" -> Blazing fast tools, compiler breakthroughs, high-adrenaline urgent hacks. Fire, sparks, lightning, terrified/shocked expression, glowing high-energy chip, floating gold 3D text.
3. "neon_mystery" -> Security tools, leaks, reverse-engineering, dark hacking/OSINT tools. Dark tech backdrop, toxic green/cyan neon outline, steam from mysterious server module, chrome 3D text.
4. "versus_split" -> Direct alternatives, rivalries, tool showdowns (e.g. Cursor vs Claude, React vs Svelte). Red vs Blue split-screen, contrasting props on each side, split 3D text.
5. "scale_and_awe" -> Tiny micro tools with monolithic power, giant models running locally. Forced perspective holding giant/micro chip, tilt-shift bokeh, shock expression, bold 3D text.
6. "minimalist_pop" -> Shocking singular truths, 1-line game changers, simple revelations. Solid electric yellow/cyan background, extreme close-up face, 1 massive 3D prop, ultra-clean pop text.
7. "cinematic_high_octane" -> Monumental AI shifts, industry killers, high-octane data weapons. 14mm wide-angle hero action pose, anamorphic flares, teal & orange cinematic grit, metallic 3D text.

TOPIC / REPOSITORY:
Name: ${repoName}
Description: ${description}
Context: ${readmeSnippet}

Return ONLY a valid JSON object matching this schema:
{
  "archetypeId": "white_studio_dotgrid" | "total_chaos" | "neon_mystery" | "versus_split" | "scale_and_awe" | "minimalist_pop" | "cinematic_high_octane",
  "hookText": "2-3 WORDS ALL CAPS (GRADE 3 LEVEL, NO AI CLICHES)",
  "mood": "shocked" | "terrified" | "secret" | "skeptical" | "excited" | "thinking" | "laughing" | "triumph",
  "customProp": "detailed description of the physical prop tailored to this topic",
  "customAction": "subject action and interaction with the prop",
  "customBackground": "environmental and background lighting details"
}`;

    try {
      const token = await this.getAccessToken();
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-2.5-flash:generateContent`;

      const response = await axios.post(url, {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: 'application/json'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (err) {
      this.logger.warn(`Vertex concept generation failed (${err.message}). Trying OmniRoute AITextService...`);
      try {
        const { AITextService } = require('../utils/ai-text-service');
        const textService = new AITextService();
        const rawJson = await textService.generateText(promptText);
        const cleaned = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (omniErr) {
        this.logger.warn(`AI concept generation fallback triggered: ${omniErr.message}`);
        return {
          archetypeId: 'white_studio_dotgrid',
          hookText: 'TOP TOOL',
          mood: 'shocked',
          customProp: 'an oversized, tactile mechanical robot claw holding a microchip CPU with intricate wires and metallic textures resting on the studio floor',
          customAction: 'standing beside the robot claw pointing with disbelief toward the headline text',
          customBackground: 'pure bright off-white studio background with technical black micro dot-grid'
        };
      }
    }
  }

  /**
   * Batch-generate prompt options across 5 diverse archetypes (Gemini Gem style)
   */
  async generateMultiArchetypePrompts(repoData) {
    const archetypes = ['total_chaos', 'neon_mystery', 'versus_split', 'scale_and_awe', 'minimalist_pop'];
    const results = [];
    for (const arch of archetypes) {
      const prompt = this.studioGenerator.buildPrompt({
        archetypeId: arch,
        hookText: this.sanitizeHookText(repoData.hookText || 'NEW BOT', 'shocked'),
        mood: 'shocked'
      });
      results.push({
        archetypeId: arch,
        promptText: prompt
      });
    }
    return results;
  }
}

module.exports = { ThumbnailDesignerAgent };