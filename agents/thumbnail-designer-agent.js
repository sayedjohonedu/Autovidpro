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

const CATEGORIZED_GRADE_3_HOOKS = {
  danger_warning: [
    'STOP CODING', "DON'T USE", 'TOO LATE', 'IT BROKE', 'BAD NEWS', 'NO MORE', 'WATCH OUT', "DON'T TOUCH", 'BIG MISTAKE', 'WARNING'
  ],
  speed_performance: [
    'TOO FAST', 'SO QUICK', '1 CLICK', '10X SPEED', 'NO DELAY', 'SUPER FAST', 'TURBO MODE', 'INSTANT RUN', 'ZERO LAG', 'LIGHTNING SPEED'
  ],
  free_cost: [
    '100% FREE', 'ZERO COST', 'NO FEES', 'FREE BOT', 'OPEN SOURCE', 'FREE FOREVER', 'SAVE MONEY', 'BIG SAVINGS', 'FREE ACCESS', 'NEVER PAY'
  ],
  secrets_leaks: [
    'CODE LEAK', 'THE TRUTH', 'TRY THIS', 'SECRET TOOL', 'HIDDEN BOT', 'THEY LIED', 'OPEN THIS', 'LEAKED NOW', 'SECRET CODE', 'INSIDER LEAK'
  ],
  versus_rivalry: [
    'OLD VS NEW', 'KILL IT', 'IS DEAD', 'BETTER TOOL', 'REPLACE IT', 'NEW KING', 'X IS DEAD', 'SWAP THIS', 'THE WINNER', 'NEXT LEVEL'
  ],
  shock_discovery: [
    'MIND BLOWN', 'INSANE BOT', 'TRY THIS NOW', 'NEW WEAPON', 'GAME OVER', 'BIG DISCOVERY', 'TOP TIER', 'UNREAL POWER', 'CRAZY TOOL', 'MUST TRY'
  ]
};

const ALL_HOOKS_FLAT = Object.values(CATEGORIZED_GRADE_3_HOOKS).flat();

class ThumbnailDesignerAgent {
  constructor(db, credentials = {}) {
    this.db = db;
    this.logger = new Logger('ThumbnailDesigner');
    const profile = credentials.profile || {};
    const activeProfile = process.env.ACTIVE_PROFILE || profile.profileId || 'sayed_johon';
    const defaultRef = activeProfile === 'sayed_johon'
      ? path.resolve(__dirname, '..', 'Assets', 'Profiles', 'sayed_johon', 'face_reference', 'johon_reference.png')
      : path.resolve(__dirname, '..', 'Assets', 'Profiles', 'meera', 'face_reference', 'meera_reference.png');
    this.characterRefPath = credentials.characterRefPath || profile.resolved?.faceReferencePath || defaultRef;
    this.studioGenerator = new ThumbnailStudioGenerator({
      characterRefPath: this.characterRefPath
    });
    this.projectId = process.env.VERTEX_PROJECT_ID || 'newaug626';
    this.location = process.env.VERTEX_LOCATION || 'us-central1';
    this.adcPath = path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
    this.historyFilePath = path.join(__dirname, '..', 'data', 'thumbnail_history.json');
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.httpsAgent = new https.Agent({ family: 4, keepAlive: true });
  }

  async initialize() {
    this.logger.info('Initializing Multi-Archetype Thumbnail Designer Agent with Anti-Repetition Memory...');
    await this.ensureHistoryFile();
    return true;
  }

  /**
   * Ensure thumbnail history file exists
   */
  async ensureHistoryFile() {
    try {
      const dir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.historyFilePath)) {
        fs.writeFileSync(this.historyFilePath, JSON.stringify([], null, 2));
      }
    } catch (err) {
      this.logger.warn(`Could not initialize thumbnail history: ${err.message}`);
    }
  }

  /**
   * Load history of recent thumbnails
   */
  getRecentHistory(limit = 20) {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        const history = JSON.parse(raw);
        return Array.isArray(history) ? history.slice(-limit) : [];
      }
    } catch (err) {
      this.logger.warn(`Could not read thumbnail history: ${err.message}`);
    }
    return [];
  }

  /**
   * Record generated thumbnail to history
   */
  recordHistory(entry) {
    try {
      const history = this.getRecentHistory(50);
      history.push({
        hookText: entry.hookText,
        archetypeId: entry.archetypeId,
        mood: entry.mood,
        repoName: entry.repoName,
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
    } catch (err) {
      this.logger.warn(`Could not record thumbnail history: ${err.message}`);
    }
  }

  /**
   * Pick an unused fallback hook when repetition or generic words are detected
   */
  getUnusedHook(mood = 'shocked', recentHooks = []) {
    let categoryKey = 'shock_discovery';
    if (mood === 'terrified' || mood === 'skeptical') categoryKey = 'danger_warning';
    else if (mood === 'secret') categoryKey = 'secrets_leaks';
    else if (mood === 'excited' || mood === 'triumph') categoryKey = 'speed_performance';

    const categoryPool = CATEGORIZED_GRADE_3_HOOKS[categoryKey] || ALL_HOOKS_FLAT;
    const available = categoryPool.filter(h => !recentHooks.includes(h.toUpperCase()));

    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    const allAvailable = ALL_HOOKS_FLAT.filter(h => !recentHooks.includes(h.toUpperCase()));
    if (allAvailable.length > 0) {
      return allAvailable[Math.floor(Math.random() * allAvailable.length)];
    }

    return 'NEW TOOL';
  }

  /**
   * Deterministic Grade 3 Sanitizer + Anti-Repetition Guard
   */
  sanitizeHookText(hookText, mood = 'shocked', recentHooks = []) {
    let text = (hookText || '').toUpperCase().replace(/["'’]/g, '').trim();

    // Check for explicit banned AI words
    for (const banned of BANNED_AI_WORDS) {
      if (text.includes(banned)) {
        const replacement = GRADE_3_FALLBACKS[banned] || this.getUnusedHook(mood, recentHooks);
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

    let finalText = sanitizedWords.join(' ').trim();

    // Anti-Repetition Check: If this hook was used in recent history, rotate it immediately!
    const normalizedRecent = recentHooks.map(h => h.toUpperCase());
    if (!finalText || normalizedRecent.includes(finalText)) {
      const freshHook = this.getUnusedHook(mood, normalizedRecent);
      this.logger.info(`Anti-Repetition Triggered: Hook "${finalText}" was recently used. Rotated to: "${freshHook}"`);
      finalText = freshHook;
    }

    return finalText;
  }

  /**
   * Autonomously design and generate a viral 16:9 YouTube thumbnail
   * Auto-picks the best archetype matching the repository news and video title with Grade 3 vocabulary
   */
  async generateThumbnail(repoOrScriptData, outputPath) {
    try {
      const topicName = repoOrScriptData.repo || repoOrScriptData.title || 'Trending Video';
      this.logger.info(`Devising viral thumbnail concept for: ${topicName}`);

      // 1. Fetch recent history for anti-repetition guards
      const recentHistory = this.getRecentHistory(15);
      const recentHooks = recentHistory.map(h => h.hookText);
      const recentArchetypes = recentHistory.slice(-3).map(h => h.archetypeId);

      // 2. Ask AI Director to analyze the news/repo and auto-pick the optimal archetype + props with anti-repetition memory
      const concept = await this.designConceptWithAI(repoOrScriptData, recentHooks, recentArchetypes);
      
      // 3. Strictly sanitize hookText to Grade 3 vocabulary + ensure zero repetition
      const cleanHookText = this.sanitizeHookText(concept.hookText, concept.mood, recentHooks);
      this.logger.info(`Concept devised: [Archetype: ${concept.archetypeId}] Clean Hook (Grade 3): "${cleanHookText}" | Mood: ${concept.mood}`);

      // 4. Render via ThumbnailStudioGenerator (Vertex AI Nano Banana 2 / OmniRoute Antigravity)
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

      // 5. Record to persistent history
      this.recordHistory({
        hookText: cleanHookText,
        archetypeId: concept.archetypeId,
        mood: concept.mood,
        repoName: topicName
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
  async designConceptWithAI(repoData, recentHooks = [], recentArchetypes = []) {
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
4. ANTI-REPETITION MANDATE (STRICT):
   - Do NOT use any of these recently used hooks: [${recentHooks.length > 0 ? recentHooks.map(h => `"${h}"`).join(', ') : 'None'}]
   - Prefer rotating away from these recently used archetypes: [${recentArchetypes.length > 0 ? recentArchetypes.map(a => `"${a}"`).join(', ') : 'None'}]

5. DIVERSE HOOK INSPIRATION (PICK AN UNUSED UNIQUE ANGLE):
   - Danger/Warning: "STOP CODING", "DON'T USE", "TOO LATE", "IT BROKE", "BAD NEWS", "NO MORE", "WATCH OUT"
   - Cost/Value: "100% FREE", "ZERO COST", "SAVE MONEY", "NO FEES", "FREE BOT", "OPEN SOURCE", "FREE FOREVER"
   - Speed/Power: "TOO FAST", "SO QUICK", "1 CLICK", "10X SPEED", "TURBO MODE", "INSTANT RUN", "ZERO LAG"
   - Secrets/Discovery: "CODE LEAK", "THE TRUTH", "TRY THIS", "SECRET TOOL", "THEY LIED", "NEW BOT", "HIDDEN GEM"
   - Rivalry/Replacement: "OLD VS NEW", "KILL IT", "IS DEAD", "BETTER TOOL", "REPLACE IT", "NEW KING"
   - Shock/Impact: "MIND BLOWN", "INSANE BOT", "GAME OVER", "UNREAL POWER", "BIG WIN", "CRAZY TOOL"

AVAILABLE THUMBNAIL ARCHETYPES (ROTATE FREQUENTLY):
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
  "hookText": "2-3 WORDS ALL CAPS (GRADE 3 LEVEL, NO AI CLICHES, NOT RECENTLY USED)",
  "mood": "shocked" | "terrified" | "secret" | "skeptical" | "excited" | "thinking" | "laughing" | "triumph",
  "customProp": "detailed description of the physical prop tailored to this topic",
  "customAction": "subject action and interaction with the prop",
  "customBackground": "environmental and background lighting details"
}`;

    try {
      const { AITextService } = require('../utils/ai-text-service');
      const textService = new AITextService();
      const rawJson = await textService.generateText(promptText);
      const cleaned = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.archetypeId && parsed.hookText) {
        return parsed;
      }
      throw new Error('Invalid JSON structure returned by AI Visual Director');
    } catch (err) {
      this.logger.warn(`AI concept generation fallback triggered (${err.message}). Selecting rotated dynamic archetype...`);
      
      const allArchetypes = ['versus_split', 'total_chaos', 'neon_mystery', 'scale_and_awe', 'minimalist_pop', 'cinematic_high_octane', 'white_studio_dotgrid'];
      const availableArch = allArchetypes.filter(a => !recentArchetypes.includes(a));
      const chosenArch = availableArch.length > 0 ? availableArch[Math.floor(Math.random() * availableArch.length)] : 'total_chaos';
      const freshHook = this.getUnusedHook('shocked', recentHooks);

      return {
        archetypeId: chosenArch,
        hookText: freshHook,
        mood: 'shocked',
        customProp: 'a glowing high-tech neural processing core with pulsing energy conduits and tactile mechanical wiring',
        customAction: 'standing beside the glowing hardware pointing with disbelief toward the headline text',
        customBackground: 'cinematic studio environment with dynamic lighting and particle atmosphere'
      };
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
        hookText: this.sanitizeHookText(repoData.hookText || 'NEW BOT', 'shocked', []),
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