const { AITextService } = require('../utils/ai-text-service');

class GitHubScriptAgent {
  constructor(options = {}) {
    this.textService = new AITextService(options);
  }

  /**
   * Generate 5-scene viral tech documentary script for a single numbered repository in a compilation
   * @param {Object} repoData - Repository metadata
   * @param {string} readmeSummary - Scraped README content
   * @param {number} segmentIndex - Index of this segment (1-indexed)
   * @param {number} totalSegments - Total number of segments in compilation
   */
  async generateNumberedRepoScript(repoData, readmeSummary = '', segmentIndex = 1, totalSegments = 5) {
    const isLastSegment = segmentIndex >= totalSegments;
    const nextSegmentNum = segmentIndex + 1;

    const systemPrompt = `You are a world-class viral tech documentary filmmaker and YouTube creator.
Your goal is to explain an open-source GitHub project as a high-stakes, deeply fascinating story for a multi-repo compilation video.

CRITICAL RULES:
1. **NEVER use the word "Imagine" or "Imagine if" or "Picture this"**. That is strictly forbidden.
2. The script MUST start with the segment number:
   - For Segment 1: "Starting with number one: [Repo Name]. If you are tired of [Huge Problem/Expensive Subscription], this free tool..."
   - For Segment 2-N: "Next up at number [N]: [Repo Name]. This project has the power to [Superpower]..."
3. **Persistent HUD Hook Title**: Provide a 2-4 word high-contrast hook title (e.g. "FREE EMAIL OSINT DETECTIVE" or "OFFLINE AI SUPERCOMPUTER").
4. **Strict Grade 3–4 Level Vocabulary**: Simple words, short punchy sentences (6-12 words). No complex developer jargon.
5. **Specs & Licensing**: Clearly state memory requirements (e.g. "uses almost zero RAM"), offline capability, zero paid API keys, and open-source license.
6. **Scene 5 (Verdict & Organic Transition)**:
   - Must be a natural, conversational conclusion for THIS repository (how to grab it, why it matters).
   ${isLastSegment 
     ? '- Since this is the final repository in the countdown, conclude this tool with high energy and tease the final recap wrap-up!' 
     : `- Seamlessly tease and bridge into the next tool: "Grab this tool on GitHub from the description below. But if you think that was crazy, wait until you see number ${nextSegmentNum}..."`}
   - DO NOT insert random out-of-place advertisements. Keep the pacing smooth and exciting.
7. **DYNAMIC POP-CULTURE VISUAL QUERIES**:
   - Visual Beat \`query\` for \`gif_search\` and \`pinterest_image\` MUST be 100% unique and deeply tailored to the repository's domain!
   - NEVER use generic repetitive phrases like "happy celebration victory dance".
   - Tailor specifically to the repo's tech domain (hacker terminal, robotic arm, fast racing car, glowing processor, etc.).

Output MUST be STRICT JSON with this structure:
{
  "hookTitle": "2-4 WORD HOOK TITLE FOR TOP HUD BANNER",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "The Numbered Hook",
      "narration": "Starting with number [N]: [Repo]. If you hate paying for expensive software...",
      "fallbackGifQuery": "domain specific cinematic tech",
      "visualBeats": [
        { "type": "github_fullscreen_3d", "label": "GITHUB SPOTLIGHT", "scrollTarget": "overview" },
        { "type": "gif_search", "query": "contextual tech metaphor or reaction" },
        { "type": "gif_search", "query": "another unique domain-specific cinematic shot" }
      ]
    },
    {
      "sceneNumber": 2,
      "title": "The Core Superpower",
      "narration": "It does all the heavy lifting automatically in seconds...",
      "fallbackGifQuery": "domain cinematic futuristic tech",
      "visualBeats": [
        { "type": "repo_media", "fallbackQuery": "domain specific visual metaphor" },
        { "type": "gif_search", "query": "domain specific movie or pop culture action" },
        { "type": "gif_search", "query": "third unique cinematic shot for this domain" }
      ]
    },
    {
      "sceneNumber": 3,
      "title": "Feature Escalation",
      "narration": "And here is the wildest part. It also lets you...",
      "fallbackGifQuery": "epic tech reveal cinematic",
      "visualBeats": [
        { "type": "repo_media", "fallbackQuery": "domain specific visual metaphor" },
        { "type": "gif_search", "query": "domain specific movie or pop culture action" },
        { "type": "gif_search", "query": "another unique domain reaction shot" }
      ]
    },
    {
      "sceneNumber": 4,
      "title": "Hardware Specs & Licensing",
      "narration": "It runs on tiny memory, works 100% offline, and is free forever under an open source license.",
      "fallbackGifQuery": "futuristic server processor neon",
      "visualBeats": [
        { "type": "pinterest_image", "query": "domain aesthetic technology visual" },
        { "type": "gif_search", "query": "domain specific movie or pop culture action" },
        { "type": "gif_search", "query": "speed or power cinematic shot" }
      ]
    },
    {
      "sceneNumber": 5,
      "title": "Verdict & Transition",
      "narration": "Grab this on GitHub from the description below. Now let's move to our next tool...",
      "fallbackGifQuery": "cinematic tech transition warp speed",
      "visualBeats": [
        { "type": "github_fullscreen_3d", "label": "GITHUB REPO", "scrollTarget": "codebase" },
        { "type": "gif_search", "query": "hyperspace warp drive portal galaxy transition" },
        { "type": "gif_search", "query": "futuristic city speed motion blur" }
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

Generate the Segment #${segmentIndex} script with unique, cinematic visual queries in strict JSON.`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.8 });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse JSON from response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.warn(`[GitHubScriptAgent] AI fallback for Segment #${segmentIndex}: ${err.message}`);
      const repoShort = repoData.repo.split('/')[1] || repoData.repo;
      const lang = repoData.language || 'tech';
      
      const transitionNarration = isLastSegment
        ? `You can grab ${repoShort} completely free on GitHub using the link in the description below! Now let's wrap up our full countdown!`
        : `You can grab ${repoShort} completely free on GitHub right now. But if you thought that was cool, wait until you see number ${nextSegmentNum}!`;

      return {
        hookTitle: `${repoShort.toUpperCase()} OPEN SOURCE`,
        scenes: [
          {
            sceneNumber: 1,
            title: "The Numbered Hook",
            fallbackGifQuery: `${lang} hacker matrix terminal neon`,
            narration: segmentIndex === 1
              ? `Starting with number one: ${repoShort}! If you want to save hundreds of hours of manual work, this free tool will blow your mind!`
              : `Next up at number ${segmentIndex}: ${repoShort}! This repository has the power to automate your entire workflow completely for free!`,
            visualBeats: [
              { type: "github_fullscreen_3d", label: "GITHUB SPOTLIGHT", scrollTarget: "overview" },
              { type: "gif_search", query: `${repoShort} matrix cyber hacker terminal` },
              { type: "gif_search", query: `${lang} code explosion neon cinematic` }
            ]
          },
          {
            sceneNumber: 2,
            title: "The Core Superpower",
            fallbackGifQuery: `${lang} futuristic blueprint glowing`,
            narration: `It is called ${repoShort}, and it does all the heavy lifting in seconds with zero complicated setup!`,
            visualBeats: [
              { type: "repo_media", fallbackQuery: `${lang} futuristic circuit neon blueprint` },
              { type: "gif_search", query: `iron man suit up assembling future tech` },
              { type: "gif_search", query: `warp speed hyperspace galaxy stars` }
            ]
          },
          {
            sceneNumber: 3,
            title: "Feature Escalation",
            fallbackGifQuery: `epic tech reveal laser beam`,
            narration: `And here is the wildest part. It connects with your daily apps seamlessly to give you instant superpowers!`,
            visualBeats: [
              { type: "repo_media", fallbackQuery: `quantum computer blue core laser cooling` },
              { type: "gif_search", query: `warp speed hyperspace stars galaxy` },
              { type: "gif_search", query: `robot futuristic factory assembly line` }
            ]
          },
          {
            sceneNumber: 4,
            title: "Hardware Specs & Licensing",
            fallbackGifQuery: `glowing processor chip cyberpunk`,
            narration: `It uses almost zero computer memory, works completely offline, requires no paid API keys, and is free forever under an open source license!`,
            visualBeats: [
              { type: "pinterest_image", query: `glowing golden processor microchip cyberpunk motherboard` },
              { type: "gif_search", query: `formula one race car pit stop speed` },
              { type: "gif_search", query: `vault heavy steel door opening gold` }
            ]
          },
          {
            sceneNumber: 5,
            title: "Verdict & Transition",
            fallbackGifQuery: `hyperspace warp drive portal galaxy`,
            narration: transitionNarration,
            visualBeats: [
              { type: "github_fullscreen_3d", label: "GET THE CODE", scrollTarget: "codebase" },
              { type: "gif_search", query: `hyperspace warp drive galaxy portal` },
              { type: "gif_search", query: `futuristic city speed motion blur` }
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
2. Must start with a high-stakes hook like:
   - "I genuinely regret sharing these ${count} secret GitHub repositories because nobody was supposed to know they exist..."
   - "I found ${count} secret open-source tools that replace thousands of dollars of paid subscriptions and API credits..."
3. Grade 3-4 simple words. High energy, punchy.

Output JSON schema:
{
  "title": "${count} Secret GitHub Tools That Feel Illegal to Know",
  "narration": "Narration for the master teaser intro (35-45 words)...",
  "teaserBeats": [
    { "type": "pinterest_image", "query": "secret hacker underground database neon" },
    { "type": "gif_search", "query": "mind blown explosion galaxy meme" },
    { "type": "pinterest_image", "query": "cyberpunk supercomputer server room" }
  ]
}`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Repositories to feature: ${names}` }
      ], { temperature: 0.7 });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {}

    return {
      title: `${count} Secret GitHub Tools That Replace Expensive Software`,
      narration: `I genuinely regret sharing these ${count} secret GitHub repositories, because they replace thousands of dollars of paid subscriptions and API credits for free! Let's count them down!`,
      teaserBeats: [
        { type: "pinterest_image", query: "secret hacker underground database neon" },
        { type: "gif_search", query: "mind blown explosion galaxy meme" },
        { type: "pinterest_image", query: "cyberpunk supercomputer server room" }
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
    { "type": "gif_search", "query": "celebration crowd victory fireworks energy" },
    { "type": "pinterest_image", "query": "cyberpunk neon supercomputer laboratory" },
    { "type": "gif_search", "query": "rocket launch explosion victory celebration" }
  ]
}`;

    try {
      const raw = await this.textService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Repositories covered: ${names}` }
      ], { temperature: 0.7 });

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {}

    return {
      narration: `And that is a wrap on our countdown! We just broke down ${count} secret open-source powerhouses: ${names}. Drop a comment below telling me which one you are installing first, and hit subscribe for fresh free tool drops every single week!`,
      outroBeats: [
        { type: "gif_search", query: "celebration crowd victory energy" },
        { type: "pinterest_image", query: "cyberpunk neon city skyline victory" },
        { type: "gif_search", query: "rocket launch space explosion success" }
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

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
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
