const { AITextService } = require('../utils/ai-text-service');
const { CuratedGIFLibrary } = require('../utils/curated-gif-library');
const { storylineFrameworkEngine } = require('../utils/storyline-frameworks');

class GitHubScriptAgent {
  constructor(options = {}) {
    this.textService = new AITextService(options);
    this.gifLib = new CuratedGIFLibrary(options);
    this.frameworkEngine = storylineFrameworkEngine;
  }

  /**
   * Deterministic cleaner for narration text
   */
  sanitizeNarrationText(text) {
    if (!text) return '';
    return text
      .replace(/[`*#~"“”'‘’]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g, '$2')
      .replace(/(\w)[-_](\w)/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate 5-scene viral tech documentary script for a single numbered repository in a compilation
   * @param {Object} repoData - Repository metadata
   * @param {string} readmeSummary - Scraped README content
   * @param {number} segmentIndex - Index of this segment (1-indexed)
   * @param {number} totalSegments - Total number of segments in compilation
   */
  async generateNumberedRepoScript(repoData, readmeSummary = '', segmentIndex = 1, totalSegments = 5, options = {}) {
    const isLastSegment = segmentIndex >= totalSegments;
    const nextSegmentNum = segmentIndex + 1;
    const repoShort = repoData.repo.split('/')[1] || repoData.repo;

    // Resolve dynamic storytelling framework for this segment
    const rotation = this.frameworkEngine.getVideoFrameworkRotation(totalSegments);
    const activeFramework = options.framework || rotation[(segmentIndex - 1) % rotation.length];

    // Dynamic creative guidance based on segment position & active framework
    let scene5Goal = '';
    let hookSuggestions = '';

    if (segmentIndex === 1) {
      hookSuggestions = `Open with a strong hook introducing the first tool (${repoShort}) using the ${activeFramework.name} framework. For example: "Starting off our countdown...", "Kicking off at number one...", or "First up, meet ${repoShort}!"`;
      scene5Goal = `Wrap up ${repoShort}'s verdict, then build curiosity by forward-teasing a powerhouse tool coming up later in the list (e.g. #4 or the grand finale). Do NOT say "wait until number two".`;
    } else if (segmentIndex === 2) {
      hookSuggestions = `Introduce tool #${segmentIndex} (${repoShort}) with the ${activeFramework.name} angle (e.g. "Taking the second spot...", "At number two, meet...", "Coming in at number two...").`;
      scene5Goal = `Wrap up naturally and ask viewers to drop a LIKE if they love open-source tools. Keep it organic and conversational.`;
    } else if (segmentIndex === 3) {
      hookSuggestions = `Introduce tool #${segmentIndex} (${repoShort}) dynamically with the ${activeFramework.name} angle (e.g. "Moving right along to number three...", "For our third tool...", "Landing at number three...").`;
      scene5Goal = `Wrap up naturally and give a quick shoutout to visit "juno verse ai dot com" or "pee a i dot com" for daily tutorials and AI workflows.`;
    } else if (segmentIndex === 4) {
      hookSuggestions = `Introduce tool #${segmentIndex} (${repoShort}) with the ${activeFramework.name} angle (e.g. "Landing at number four...", "Next up in the fourth spot...", "At number four...").`;
      scene5Goal = `Wrap up naturally and ask an engaging question to spark discussion in the COMMENTS (${activeFramework.ctaPromptInstruction}).`;
    } else if (segmentIndex === 5 && !isLastSegment) {
      hookSuggestions = `Introduce tool #${segmentIndex} (${repoShort}) with high momentum using the ${activeFramework.name} angle (e.g. "At number five...", "Taking spot number five...", "Moving into number five...").`;
      scene5Goal = `Wrap up naturally and invite viewers to SUBSCRIBE to the channel for daily open-source discoveries.`;
    } else if (isLastSegment) {
      hookSuggestions = `Introduce the final tool #${segmentIndex} (${repoShort}) with grand finale energy using the ${activeFramework.name} angle (e.g. "And for our grand finale at number ${segmentIndex}...", "Finally, the number ${segmentIndex} spot goes to...").`;
      scene5Goal = `Deliver an epic conclusion for this final project, then transition smoothly into the full countdown recap.`;
    } else {
      hookSuggestions = `Introduce tool #${segmentIndex} (${repoShort}) naturally using the ${activeFramework.name} angle.`;
      scene5Goal = `Conclude this tool smoothly and transition to the next chapter.`;
    }

    const isBengali = (options.language || '').toLowerCase().includes('bengali') || (options.language || '').toLowerCase().includes('bn');
    const languageInstruction = isBengali
      ? `CRITICAL LANGUAGE REQUIREMENT: Write all scene narration in fluent, high-energy spoken Bengali / Banglish (বাংলা / ব্যাংলিশ). Keep technical loanwords (GitHub, open-source, AI, model, API, RAM, offline) in natural phonetic English words, and the sentence structure in authentic spoken Bengali.`
      : `Write all scene narration in clear, natural, high-energy global English.`;

    const curatedCatalogSummary = this.gifLib.getLibraryPromptSummary();

    const systemPrompt = `You are a world-class viral tech documentary filmmaker and YouTube creator.
Your goal is to explain an open-source GitHub project as a high-stakes, deeply fascinating story for a multi-repo compilation video.
You MUST write 100% original, dynamic, captivating copy tailored specifically to this repository's unique features. NEVER use rigid templates or repetitive filler.

STORYTELLING FRAMEWORK ASSIGNED TO THIS SEGMENT:
- Framework Archetype: ${activeFramework.name} (${activeFramework.badge})
- Psychological Target: ${activeFramework.targetEmotion}
- Tone & Voice: ${activeFramework.hookTone}
- Hook Directive: ${activeFramework.hookPromptInstruction}
- Conflict Directive: ${activeFramework.stakesPromptInstruction}
- Verdict & CTA Directive: ${activeFramework.ctaPromptInstruction}

CRITICAL SCRIPTING RULES:
1. **NEVER use "Imagine", "Imagine if", or "Picture this"**.
2. **ZERO BACKTICKS / QUOTES / MARKDOWN IN NARRATION**:
   - Treat all repository and tool names as clean spoken English proper nouns.
   - NEVER put backticks, quotation marks, asterisks, or brackets around tool names. TTS will pronounce symbols if you use them.
3. **Scene 1 (Opening Hook)**:
   - ${hookSuggestions}
   - ${activeFramework.hookPromptInstruction}
   - Immediately follow with the high-stakes problem or superpower of this repo.
   - Keep opening phrasing varied and natural; never repeat generic formulas across segments.
4. **Persistent HUD Hook Title**: Provide a unique 2-4 word punchy title in English matching the ${activeFramework.name} tone (e.g. "${activeFramework.hudTitleOptions.join('" or "')}").
5. **Vocabulary & Tone**: Grade 3–4 level simplicity. Short punchy sentences (6-12 words). Zero boring corporate fluff.
6. **Specs & Hardware**: Highlight memory footprint, 100% offline capability, zero API keys, and open-source license.
7. **Scene 5 (Verdict & Mid-Video Goal)**:
   - Objective for Segment #${segmentIndex}: ${scene5Goal}
   - Write completely fresh, authentic voiceover copy fulfilling this goal.
   - Do NOT say "wait until number ${nextSegmentNum}".
8. **Pronunciation**: If mentioning websites, spell them out phonetically: "juno verse ai dot com" or "pee a i dot com".
9. **VISUAL DIRECTOR (CURATED MEMES, MOVIES & CINEMATICS)**:
   - For every visual beat, pick a punchy 2-4 word query matching the emotional beat and metaphor of the scene.
   - PRIORITIZE OUR LOCAL CURATED GIF LIBRARY:
${curatedCatalogSummary}
   - Metaphor Mapping Guide:
     * Speed & Velocity: "ishowspeed speed", "rushing mr bean", "overtake mr bean", "dirt bike speed", "future time lapse".
     * Coding / Hacker / Terminal: "hacker hacking and dancing", "cyber matrix code terminal", "developer typing workstation", "computer working", "man with laptops", "dark room coder".
     * Mind-Blown / Disbelief / Iconic Memes: "leonardo dicaprio cheers", "leonardo dicaprio fist bite", "mr bean omg", "mr bean confused", "monkey throwing computer", "nuclear explosion", "elon musk dancing".
     * Assembly / Superpowers / AI Creation: "working iron man", "iron man hologram", "doctor strange magic", "power flowing thor", "super power strike", "terminator majestic look", "robotics atlas".
     * Math / Algorithms / Deep Logic: "mathematician complex math", "very complex math woman", "sherlock holmes thinking", "i have a plan".
     * Bugs / Glitches / Crashes: "computer bugs", "system glitching", "computer spark error", "bike fail", "hammering on leg".
     * Business / Money / Free Value: "burning money", "sales and marketing", "selling for sale", "black friday superstore".
     * Victory / Celebration: "leonardo dicaprio cheers", "friends confetti celebration", "mr bean celebrating", "nailed it", "sweeeet".

Output MUST be STRICT JSON with this structure:
{
  "hookTitle": "2-4 WORD HOOK TITLE FOR TOP HUD BANNER",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "The Numbered Hook",
      "narration": "Original dynamic opening hook introducing #${segmentIndex} and its primary superpower...",
      "fallbackGifQuery": "domain specific cinematic tech",
      "visualBeats": [
        { "type": "github_fullscreen_3d", "label": "GITHUB SPOTLIGHT", "scrollTarget": "overview" },
        { "type": "gif_search", "query": "contextual curated tech metaphor or reaction" },
        { "type": "gif_search", "query": "another unique domain-specific cinematic shot" }
      ]
    },
    {
      "sceneNumber": 2,
      "title": "The Core Superpower",
      "narration": "It does all the heavy lifting automatically in seconds...",
      "fallbackGifQuery": "domain cinematic futuristic tech",
      "visualBeats": [
        { "type": "github_fullscreen_3d", "label": "ARCHITECTURE", "scrollTarget": "readme" },
        { "type": "gif_search", "query": "assembly or automation metaphor" },
        { "type": "gif_search", "query": "satisfying workflow action" }
      ]
    },
    {
      "sceneNumber": 3,
      "title": "Real World Problem Solved",
      "narration": "Before this, you had to spend hours configuring complex setups...",
      "fallbackGifQuery": "cinematic complex problem solving",
      "visualBeats": [
        { "type": "gif_search", "query": "struggle or deep logic reaction" },
        { "type": "github_fullscreen_3d", "label": "DEEP DEMO", "scrollTarget": "overview" },
        { "type": "gif_search", "query": "magic transformation victory" }
      ]
    },
    {
      "sceneNumber": 4,
      "title": "Hardware Specs & Licensing",
      "narration": "It runs on tiny memory, works 100% offline, and is free forever under an open source license.",
      "fallbackGifQuery": "futuristic server processor neon",
      "visualBeats": [
        { "type": "pinterest_image", "query": "domain aesthetic technology visual" },
        { "type": "gif_search", "query": "curated domain specific movie or pop culture action" },
        { "type": "gif_search", "query": "speed or power cinematic shot" }
      ]
    },
    {
      "sceneNumber": 5,
      "title": "Verdict & Transition",
      "narration": "Grab this on GitHub from the description below...",
      "fallbackGifQuery": "cinematic tech transition warp speed",
      "visualBeats": [
        { "type": "github_fullscreen_3d", "label": "GITHUB REPO", "scrollTarget": "codebase" },
        { "type": "gif_search", "query": "leonardo dicaprio cheers victory" },
        { "type": "gif_search", "query": "going to the future time lapse" }
      ]
    }
  ]
}`;

    const userPrompt = `
Segment: #${segmentIndex} of ${totalSegments}
Repository: ${repoData.repo} (${repoData.url})
Stars: ${repoData.totalStars} (+${repoData.starsToday} today)
Language: ${repoData.language}
Description: ${repoData.description}

README:
${readmeSummary.substring(0, 1500)}

Generate the Segment #${segmentIndex} script with unique, curated visual queries in strict JSON.`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.8 });

      const rawStr = typeof raw === 'string' ? raw : (raw?.content || JSON.stringify(raw));
      let jsonStr = rawStr;
      const startIdx = rawStr.indexOf('{');
      const endIdx = rawStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = rawStr.substring(startIdx, endIdx + 1);
      }
      
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.scenes)) {
        parsed.scenes.forEach(sc => {
          if (sc.narration) {
            sc.narration = this.sanitizeNarrationText(sc.narration);
          }
        });
        parsed.framework = activeFramework.id;
        parsed.frameworkName = activeFramework.name;
        parsed.frameworkBadge = activeFramework.badge;
        try {
          this.frameworkEngine.recordUsage(activeFramework.id, {
            repo: repoData.repo,
            hookTitle: parsed.hookTitle,
            channel: 'youtube_video'
          });
        } catch (e) {}
      }
      return parsed;
    } catch (err) {
      console.warn(`[GitHubScriptAgent] AI fallback for Segment #${segmentIndex}: ${err.message}`);
      const lang = repoData.language || 'tech';
      
      let fallbackScene5Narration = '';
      if (segmentIndex === 1) {
        fallbackScene5Narration = `Grab ${repoShort} completely free on GitHub using the link below. But if you think that was impressive, wait until you see the secret powerhouse coming up at number four!`;
      } else if (segmentIndex === 2) {
        fallbackScene5Narration = `You can grab ${repoShort} completely free from the link in the description. If you are enjoying these open-source tools, please smash that like button so more developers can find this!`;
      } else if (segmentIndex === 3) {
        fallbackScene5Narration = `Grab this repository from the link below. By the way, if you want daily AI agent workflows and free developer tutorials, check out juno verse ai dot com or visit peeai dot com to level up your skills!`;
      } else if (segmentIndex === 4) {
        fallbackScene5Narration = `The GitHub link is waiting for you in the description below. Quick question: which AI workflow or open-source tool are you using the most right now? Drop your thoughts in the comments!`;
      } else if (segmentIndex === 5 && !isLastSegment) {
        fallbackScene5Narration = `You can clone ${repoShort} for free on GitHub right now. And make sure to hit that subscribe button to join Junoverse so you never miss our daily open-source drops!`;
      } else if (isLastSegment) {
        fallbackScene5Narration = `You can grab ${repoShort} completely free on GitHub using the link in the description below! Now let's wrap up our full countdown recap!`;
      } else {
        fallbackScene5Narration = `Grab ${repoShort} completely free on GitHub from the description below. Now let's keep moving forward!`;
      }

      return {
        hookTitle: `${repoShort.toUpperCase()} OPEN SOURCE`,
        scenes: [
          {
            sceneNumber: 1,
            title: "The Numbered Hook",
            fallbackGifQuery: `hacker hacking and dancing`,
            narration: segmentIndex === 1
              ? `Starting off our list at number one: ${repoShort}! This free open-source tool will save you hundreds of hours of manual work.`
              : `Taking spot number ${segmentIndex} is ${repoShort}! This repository gives you instant automation powers completely for free!`,
            visualBeats: [
              { type: "github_fullscreen_3d", label: "GITHUB SPOTLIGHT", scrollTarget: "overview" },
              { type: "gif_search", query: `cat crazy typing code` },
              { type: "gif_search", query: `power flowing thor superpower` }
            ]
          },
          {
            sceneNumber: 2,
            title: "The Core Superpower",
            fallbackGifQuery: `working iron man hologram`,
            narration: `It is called ${repoShort}, and it does all the heavy lifting in seconds with zero complicated setup!`,
            visualBeats: [
              { type: "repo_media", fallbackQuery: `doctor strange magic portal` },
              { type: "gif_search", query: `working iron man hologram` },
              { type: "gif_search", query: `ishowspeed speed fast` }
            ]
          },
          {
            sceneNumber: 3,
            title: "Feature Escalation",
            fallbackGifQuery: `sherlock holmes thinking`,
            narration: `And here is the wildest part. It connects with your daily apps seamlessly to give you instant superpowers!`,
            visualBeats: [
              { type: "repo_media", fallbackQuery: `mathematician complex math` },
              { type: "gif_search", query: `mr bean omg shocked` },
              { type: "gif_search", query: `robotics atlas boston dynamics` }
            ]
          },
          {
            sceneNumber: 4,
            title: "Hardware Specs & Licensing",
            fallbackGifQuery: `quantum computers`,
            narration: `It uses almost zero computer memory, works completely offline, requires no paid API keys, and is free forever under an open source license!`,
            visualBeats: [
              { type: "pinterest_image", query: `quantum computers server` },
              { type: "gif_search", query: `no internet disconnected offline` },
              { type: "gif_search", query: `man with so many laptops` }
            ]
          },
          {
            sceneNumber: 5,
            title: "Verdict & Transition",
            fallbackGifQuery: `leonardo dicaprio cheers`,
            narration: fallbackScene5Narration,
            visualBeats: [
              { type: "github_fullscreen_3d", label: "GET THE CODE", scrollTarget: "codebase" },
              { type: "gif_search", query: `leonardo dicaprio cheers victory` },
              { type: "gif_search", query: `elon musk dancing celebration` }
            ]
          }
        ]
      };
    }
  }

  /**
   * Generate High-Stakes Master Compilation Intro (0:00 - 0:25)
   */
  async generateMasterCompilationIntro(repoList = []) {
    const count = repoList.length || 5;
    const names = repoList.map(r => r.repo.split('/')[1] || r.repo).join(', ');

    const systemPrompt = `You are a viral YouTube creator writing the opening 20-second hook for a compilation video of ${count} open-source GitHub repositories.

CRITICAL RULES:
1. **NEVER use "Imagine" or "Imagine if"**.
2. **NEVER say "Starting with number one" or mention "number one" in this intro**. Segment 1 will introduce number one itself!
3. Conclude the intro with a varied, high-energy countdown launch phrase:
   - "Let's jump right in!"
   - "Let's count them down!"
   - "Here is the full breakdown!"
   - "Let's get right into it!"
   - "Check this out!"
   - "Let's roll!"
4. Must start with a high-stakes hook like:
   - "I genuinely regret sharing these ${count} secret GitHub repositories because nobody was supposed to know they exist..."
   - "I found ${count} secret open-source tools that replace thousands of dollars of paid subscriptions and API credits..."
5. Grade 3-4 simple words. High energy, punchy (30-40 words).

Output JSON schema:
{
  "title": "${count} Secret GitHub Tools That Feel Illegal to Know",
  "narration": "Narration for the master teaser intro (30-40 words)...",
  "teaserBeats": [
    { "type": "gif_search", "query": "leonardo dicaprio fist bite oh my god" },
    { "type": "gif_search", "query": "nuclear explosion mind blown" },
    { "type": "gif_search", "query": "power flowing thor superpower" }
  ]
}`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Repositories to feature: ${names}` }
      ], { temperature: 0.7 });

      const rawStr = typeof raw === 'string' ? raw : (raw?.content || JSON.stringify(raw));
      const startIdx = rawStr.indexOf('{');
      const endIdx = rawStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return JSON.parse(rawStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {}

    return {
      title: `${count} Secret GitHub Tools That Replace Expensive Software`,
      narration: `I found ${count} secret open-source tools on GitHub that replace thousands of dollars of paid subscriptions for free. Let's get right into it!`,
      teaserBeats: [
        { type: "gif_search", query: "leonardo dicaprio fist bite oh my god" },
        { type: "gif_search", query: "nuclear explosion mind blown" },
        { type: "gif_search", query: "power flowing thor superpower" }
      ]
    };
  }

  /**
   * Generate Master Compilation Outro (Final 20-30s) — Organic, engaging conclusion
   */
  async generateMasterCompilationOutro(repoList = []) {
    const count = repoList.length || 5;
    const names = repoList.map(r => r.repo.split('/')[1] || r.repo).join(', ');

    const systemPrompt = `You are a viral YouTube tech host writing the final 20-second wrap-up for a compilation video of ${count} open-source GitHub repositories.

CRITICAL RULES:
1. Natural, conversational, high energy. Grade 3-4 simple words.
2. Summarize the power of the repositories covered (${names}).
3. Ask ONE authentic community question (e.g. which one they are cloning first, or which tool we should review next).
4. Naturally invite viewers to subscribe for weekly open-source drops and check out the official links in the description.
5. If mentioning the website, write phonetically as "juno verse ai dot com" with zero stutter.
6. NO repetitive robotic corporate ads. Keep it authentic and exciting.

Output STRICT JSON:
{
  "narration": "Natural, exciting outro narration (35-45 words)...",
  "outroBeats": [
    { "type": "gif_search", "query": "leonardo dicaprio cheers celebration" },
    { "type": "gif_search", "query": "friends confetti celebration" },
    { "type": "gif_search", "query": "elon musk dancing celebration" }
  ]
}`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Repositories covered: ${names}` }
      ], { temperature: 0.7 });

      const rawStr = typeof raw === 'string' ? raw : (raw?.content || JSON.stringify(raw));
      const startIdx = rawStr.indexOf('{');
      const endIdx = rawStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return JSON.parse(rawStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {}

    return {
      narration: `And that is a wrap on our countdown! We just broke down ${count} secret open-source powerhouses: ${names}. Drop a comment below telling me which one you are installing first, and hit subscribe for fresh free tool drops every single week!`,
      outroBeats: [
        { type: "gif_search", query: "leonardo dicaprio cheers celebration" },
        { type: "gif_search", query: "friends confetti celebration" },
        { type: "gif_search", query: "elon musk dancing celebration" }
      ]
    };
  }

  /**
   * Generate High-CTR Master Title, Description, and Tags
   */
  async generateMasterCompilationMetadata(repoList = []) {
    const count = repoList.length || 5;
    const names = repoList.map(r => r.repo.split('/')[1] || r.repo).join(', ');
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    const systemPrompt = `You are a YouTube viral packaging and metadata expert specializing in high-CTR tech and open-source videos.
Generate an irresistible YouTube package for a compilation video of ${count} open-source GitHub repositories.

CRITICAL RULES:
1. **Title Rules**:
   - Under 70 characters.
   - MUST include exact date at the end in parentheses: (${dateFormatted}).
   - Use high-CTR curiosity, cost-saving, or secret formulas:
     * "Stop Paying for AI: ${count} Secret GitHub Repositories (${dateFormatted})"
     * "These ${count} GitHub Repositories Feel Completely Illegal (${dateFormatted})"
     * "I Tested ${count} Free AI GitHub Repos (So You Don't Have To) (${dateFormatted})"
     * "${count} Secret GitHub Tools That Will Save You Thousands (${dateFormatted})"
2. **Teaser Description**:
   - 2 punchy, curiosity-inducing sentences.
3. **Tags**:
   - 10-15 highly relevant YouTube tags.

Output STRICT JSON:
{
  "title": "Stop Paying for AI: ${count} Secret GitHub Repositories (${dateFormatted})",
  "teaserDescription": "Two sentences teasing the insane value and money saved with these open-source tools.",
  "keywords": ["github trending", "open source", "free ai tools", "automation", "developer tools"],
  "tags": ["github", "opensource", "aitools", "developer", "coding", "software"]
}`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Repositories: ${names}` }
      ], { temperature: 0.7 });

      const rawStr = typeof raw === 'string' ? raw : (raw?.content || JSON.stringify(raw));
      const startIdx = rawStr.indexOf('{');
      const endIdx = rawStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return JSON.parse(rawStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {}

    return {
      title: `Stop Paying for AI: ${count} Secret GitHub Repositories (${dateFormatted})`,
      teaserDescription: `Discover ${count} incredible open-source GitHub repositories that will save you thousands on software subscriptions. Everything is 100% free and ready to run today.`,
      keywords: ["github trending", "open source", "free ai tools", "automation", "self hosted", "developer tools"],
      tags: ["github", "opensource", "ai", "devtools", "coding", "programming", "software", "automation"]
    };
  }
}

module.exports = { GitHubScriptAgent };
