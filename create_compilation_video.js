require('dotenv').config();
process.env.ACTIVE_PROFILE = process.env.ACTIVE_PROFILE || 'sayed_johon';

const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');

const { GitHubTrendingScraper } = require('./utils/github-trending-scraper');
const { GitHubRepoInspector } = require('./utils/github-repo-inspector');
const { GitHubCardRenderer } = require('./utils/github-card-renderer');
const { GitHubScriptAgent } = require('./agents/github-script-agent');
const { PinterestImageFetcher } = require('./utils/pinterest-image-fetcher');
const { GIFMotionFetcher } = require('./utils/gif-motion-fetcher');
const { PlayPhraseMotionFetcher } = require('./utils/playphrase-motion-fetcher');
const { HybridMotionFetcher } = require('./utils/hybrid-motion-fetcher');
const { GoogleVertexTTS } = require('./utils/google-vertex-tts');
const { SubtitleRenderer } = require('./utils/subtitle-renderer');
const { HUDOverlayRenderer } = require('./utils/hud-overlay-renderer');
const { FFmpegMotionCanvas } = require('./utils/ffmpeg-motion-canvas');
const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const { ThumbnailStudioGenerator } = require('./utils/thumbnail-studio-generator');
const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');
const { ScreenStudioCursorAnimator } = require('./utils/screen-studio-cursor-animator');
const { ProfileManager } = require('./utils/profile-manager');
const { OmniVoiceTTS } = require('./utils/omnivoice-tts');
const { YouTubeUploader } = require('./utils/youtube-uploader');
const CloudRenderClient = require('./utils/cloud-render-client');

const execAsync = promisify(exec);

async function getAudioDuration(audioPath) {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
  const { stdout } = await execAsync(cmd);
  return parseFloat(stdout.trim()) || 10.0;
}

/**
 * Render a single numbered repository segment (approx 45-60s)
 */
async function renderNumberedRepoSegment({
  repoData,
  segmentIndex,
  totalSegments,
  baseOutputDir,
  sharedEngines
}) {
  const safeRepoName = repoData.repo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const segDir = path.join(baseOutputDir, `segment_${String(segmentIndex).padStart(2, '0')}_${safeRepoName}`);
  const audioDir = path.join(segDir, 'audio');
  const subsDir = path.join(segDir, 'subs');
  const clipsDir = path.join(segDir, 'clips');
  const cardsDir = path.join(segDir, 'cards');
  const pinImgDir = path.join(segDir, 'pinterest_images');
  const mediaDir = path.join(segDir, 'repo_media');

  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(subsDir, { recursive: true });
  await fs.mkdir(clipsDir, { recursive: true });
  await fs.mkdir(cardsDir, { recursive: true });
  await fs.mkdir(pinImgDir, { recursive: true });
  await fs.mkdir(mediaDir, { recursive: true });

  const { inspector, cardRenderer, scriptAgent, pinterestFetcher, gifFetcher, ttsEngine, subRenderer, hudRenderer, canvasEngine, cursorAnimator, characterAnimator } = sharedEngines;

  console.log(`\n================================================================`);
  console.log(`🎬 [SEGMENT #${segmentIndex}/${totalSegments}] ${repoData.repo} (★ ${repoData.totalStars})`);
  console.log(`================================================================`);

  // 1. Inspect Repo & Discover ONLY Real Author Media (Diagrams, Architecture charts, Demos)
  console.log(`📦 Harvesting authentic README diagrams and architecture visuals...`);
  const { content: readmeText, branch } = await inspector.fetchReadme(repoData.repo);
  const readmeMediaUrls = inspector.extractReadmeMedia(readmeText, repoData.repo, branch);
  const downloadedReadmeMedia = await inspector.downloadReadmeMedia(readmeMediaUrls, mediaDir);
  const treeDiscoveredMedia = await inspector.discoverRepoAssets(repoData.repo, mediaDir, branch);
  // Filter out any tiny badges/icons or cropped generic elements
  const allAuthorMedia = [...downloadedReadmeMedia, ...treeDiscoveredMedia];

  // Capture clean full page screenshot and focused repository section cards (Header, Codetree, Install, Overview)
  const { fullPagePath: fullPageRawPath, sectionPaths = [] } = await inspector.captureFullPageScreenshot(repoData.repo, cardsDir);
  const { resizedPath: fullPageResizedPath } = await cardRenderer.prepareResizedFullPage(fullPageRawPath, cardsDir);

  // Prioritize pristine section screenshots over low-res README icons / spacers
  const validAuthorMedia = [];
  for (const mediaPath of allAuthorMedia) {
    try {
      if (mediaPath.toLowerCase().endsWith('.svg')) continue;
      const meta = await sharp(mediaPath).metadata();
      const ar = meta.width / meta.height;
      // Strictly filter out spacers (e.g. 1x33), tracking pixels, and tiny badges (< 200px or < 120px)
      if (meta.width >= 200 && meta.height >= 120 && ar >= 0.45 && ar <= 3.2) {
        validAuthorMedia.push(mediaPath);
      }
    } catch (e) {}
  }
  const pristineRepoVisuals = [...sectionPaths, ...validAuthorMedia];
  console.log(`📦 Verified ${pristineRepoVisuals.length} pristine visual section cards & diagrams for ${repoData.repo}`);

  // 2. Generate Numbered Script
  console.log(`🎙️ [ScriptAgent] Scripting Segment #${segmentIndex}/${totalSegments} (${sharedEngines.profile?.language || 'english'}): ${repoData.repo}...`);
  const scriptData = await scriptAgent.generateNumberedRepoScript(repoData, readmeText, segmentIndex, totalSegments, { language: sharedEngines.profile?.language });
  console.log(`🎭 Storyline Angle: [${scriptData.frameworkBadge || scriptData.framework || 'FRAMEWORK'}] - ${scriptData.frameworkName || ''}`);
  await fs.writeFile(path.join(segDir, 'script.json'), JSON.stringify(scriptData, null, 2));

  // 3. Generate Persistent Top HUD Banner
  const hudBannerPath = path.join(segDir, 'top_hud_banner.png');
  await hudRenderer.generateTopHUDBanner({
    segmentNumber: segmentIndex,
    totalSegments,
    hookTitle: scriptData.hookTitle,
    repoName: repoData.repo,
    starCount: repoData.totalStars,
    outputPath: hudBannerPath
  });
  console.log(`✨ Top HUD Banner generated: "${scriptData.hookTitle}"`);

  // 3.5 Pre-render a continuous 30-second Full Screen Studio flight for this repository
  const masterStudioClipPath = path.join(segDir, 'master_screen_studio_30s.mp4');
  console.log(`🎬 Pre-rendering continuous 30s Full-Screen Studio flight for ${repoData.repo}...`);
  await cursorAnimator.renderScreenStudioDemoClip({
    repoName: repoData.repo,
    repoUrl: `https://github.com/${repoData.repo}`,
    outputMp4Path: masterStudioClipPath,
    duration: 30.0,
    starCount: repoData.totalStars
  });

  let studioPlaybackCursor = 0.0; // Tracks playback timestamp across beats so it NEVER repeats

  // 4. Parallel Voice Synthesis across all scenes (10-GPU Swarm Acceleration)
  console.log(`\n🎙️ [OmniVoice Swarm] Pre-synthesizing all ${scriptData.scenes.length} scene voiceovers in parallel across GPU cluster...`);
  await Promise.all(scriptData.scenes.map(scene => {
    const voiceAudioPath = path.join(audioDir, `scene_${scene.sceneNumber}.mp3`);
    return ttsEngine.synthesize(scene.narration, voiceAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
  }));

  const sceneFiles = [];
  for (let sIdx = 0; sIdx < scriptData.scenes.length; sIdx++) {
    const scene = scriptData.scenes[sIdx];
    const voiceAudioPath = path.join(audioDir, `scene_${scene.sceneNumber}.mp3`);

    console.log(`\n  🗣️ Synthesizing Voice [${sharedEngines.profile?.voice?.provider || 'TTS'}]: "${scene.title}"...`);
    await ttsEngine.synthesize(scene.narration, voiceAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
    const sceneDuration = await getAudioDuration(voiceAudioPath);

    const subtitleChunks = await subRenderer.renderTimedSubtitleChunks(scene.narration, sceneDuration, subsDir, `${segmentIndex}_${scene.sceneNumber}`);

    // High-retention visual beat sequence:
    // Every segment seamlessly combines:
    // 1. Full-screen Screen Studio cursor flights (code highlights, stars, readme scrolls)
    // 2. Magic 3D Pan & Tilt GitHub CRT TV Perspective reveal
    // 3. Real author architecture diagrams / UI screenshots
    // 4. High-energy action GIFs
    // -------------------------------------------------------------
    // DYNAMIC HIGH-RETENTION VISUAL BEAT SEQUENCE (Max 3.2s per cut)
    // Seamlessly rotates:
    // 1. Screen Studio continuous cursor flights (code highlight & demo)
    // 2. Curated pop-culture / tech reaction GIFs from local library
    // 3. Authentic author architecture diagrams / UI screenshots
    // 4. Magic 3D Pan & Tilt GitHub CRT TV Perspective reveal
    // -------------------------------------------------------------
    const maxBeatDuration = 3.2;
    const targetBeatCount = Math.max(3, Math.ceil(sceneDuration / maxBeatDuration));

    const aiGifBeats = (scene.visualBeats || []).filter(b => b.type === 'gif_search');
    const customGifQuery1 = aiGifBeats[0]?.query || `${repoData.language || 'tech'} hacker coding`;
    const customGifQuery2 = aiGifBeats[1]?.query || aiGifBeats[0]?.query || `superpower speed victory`;
    const customGifQuery3 = aiGifBeats[2]?.query || `leonardo dicaprio cheers`;

    let candidateBeats = [];

    if (sIdx === 0) {
      // Scene 1: Numbered Hook (High Momentum Intro)
      candidateBeats = [
        { type: 'screen_studio_cursor' },
        { type: 'gif_search', query: customGifQuery1 },
        { type: 'github_tv_tilt', label: 'GITHUB SPOTLIGHT' },
        { type: 'gif_search', query: customGifQuery2 }
      ];
    } else if (sIdx === 1) {
      // Scene 2: Core Superpower (Author Architecture / Demo + Coding GIF)
      candidateBeats = [
        { type: pristineRepoVisuals.length > 0 ? 'repo_media' : 'github_tv_tilt', label: 'CORE ARCHITECTURE' },
        { type: 'gif_search', query: customGifQuery1 },
        { type: 'screen_studio_cursor' },
        { type: 'gif_search', query: customGifQuery2 }
      ];
    } else if (sIdx === 2) {
      // Scene 3: Feature Escalation (Deep Dive + Reaction Meme)
      candidateBeats = [
        { type: 'gif_search', query: customGifQuery1 },
        { type: 'screen_studio_cursor' },
        { type: 'github_tv_tilt', label: 'FEATURE DEMO' },
        { type: 'gif_search', query: customGifQuery2 }
      ];
    } else if (sIdx === 3) {
      // Scene 4: Specs & Offline (License + Architecture + Tech GIF)
      candidateBeats = [
        { type: 'screen_studio_cursor' },
        { type: 'gif_search', query: customGifQuery1 },
        { type: pristineRepoVisuals.length > 1 ? 'repo_media' : 'github_tv_tilt', label: '100% OFFLINE' },
        { type: 'gif_search', query: customGifQuery2 }
      ];
    } else {
      // Scene 5: Verdict & Transition / CTA (Celebration + Star + Future)
      candidateBeats = [
        { type: 'gif_search', query: customGifQuery1 || 'leonardo dicaprio cheers' },
        { type: 'screen_studio_cursor' },
        { type: 'github_tv_tilt', label: 'STAR ON GITHUB' },
        { type: 'gif_search', query: customGifQuery2 || 'going to the future time lapse' }
      ];
    }

    // Expand or trim candidates to match exact target beat count
    while (candidateBeats.length < targetBeatCount) {
      candidateBeats.push({ type: 'gif_search', query: customGifQuery3 });
    }
    const actualBeats = candidateBeats.slice(0, targetBeatCount);
    const beatDuration = sceneDuration / actualBeats.length;

    const sceneClipPaths = [];
    for (let bIdx = 0; bIdx < actualBeats.length; bIdx++) {
      const beat = actualBeats[bIdx];
      const clipOutPath = path.join(clipsDir, `clip_s${scene.sceneNumber}_b${bIdx + 1}.mp4`);
      const motionIdx = (sIdx * 2 + bIdx) % 4;

      if (beat.type === 'screen_studio_cursor') {
        const dur = beatDuration;
        const masterDur = 30.0;
        if (studioPlaybackCursor + dur > masterDur - 0.5) {
          studioPlaybackCursor = 0.0;
        }
        const startSec = studioPlaybackCursor;
        studioPlaybackCursor += dur;
        console.log(`    🖱️ Slicing Continuous Studio Flight [${startSec.toFixed(1)}s -> ${(startSec + dur).toFixed(1)}s] (No Repetition)...`);
        
        const sliceCmd = `ffmpeg -y -ss ${startSec.toFixed(2)} -i "${masterStudioClipPath}" -t ${dur.toFixed(2)} -c:v copy "${clipOutPath}"`;
        await execAsync(sliceCmd);
      } else if (beat.type === 'github_tv_tilt') {
        const label = beat.label || 'GITHUB SPOTLIGHT';
        const startY = (sIdx * 350) % 1200;
        console.log(`    📺 Rendering TV 3D Pan & Tilt [${label}] (${beatDuration.toFixed(1)}s)...`);
        await cardRenderer.renderFullScreen3DPanTiltClip({
          fullPageResizedPath,
          outputMp4Path: clipOutPath,
          duration: beatDuration,
          repoName: repoData.repo,
          starCount: repoData.totalStars,
          sectionLabel: label,
          startY,
          scrollDistance: 650
        });
      } else if (beat.type === 'repo_media' && pristineRepoVisuals.length > 0) {
        const visualIndex = (sIdx === 0 && bIdx === 1) ? 0 : ((sIdx + bIdx) % pristineRepoVisuals.length);
        const rawMedia = pristineRepoVisuals[visualIndex] || pristineRepoVisuals[0];
        console.log(`    📦 UI Section Card #${visualIndex + 1} (${beatDuration.toFixed(1)}s): ${path.basename(rawMedia)}...`);
        await canvasEngine.formatToFloatingCard(rawMedia, beatDuration, clipOutPath, { motionIndex: motionIdx, isRepoMedia: true });
      } else {
        const query = beat.query || beat.fallbackQuery || `${repoData.language} tech superpower`;
        const rawBrollPath = path.join(clipsDir, `raw_s${scene.sceneNumber}_b${bIdx + 1}.mp4`);
        console.log(`    🎬 Cinema B-Roll / Movie Clip: "${query}" (${beatDuration.toFixed(1)}s)...`);
        const acquiredBroll = await gifFetcher.fetchMotionLoop(query, rawBrollPath, { duration: beatDuration });
        await canvasEngine.formatToFloatingCard(acquiredBroll, beatDuration, clipOutPath, { motionIndex: motionIdx });
      }
      sceneClipPaths.push(clipOutPath);
    }

    let characterPopIn = null;
    if (sIdx === 4 && sharedEngines.characterAnimator) {
      console.log(`    🎭 [Scene 5 CTA] Preparing Single-Pass ${sharedEngines.profile?.host?.name || 'Host'} Bottom-Right Pop-in (Segment #${segmentIndex})...`);
      characterPopIn = await sharedEngines.characterAnimator.prepareScenePopIn({
        segmentIndex,
        sceneDuration: sceneDuration,
        corner: 'bottom_right',
        scale: 0.68,
        tempDir: segDir
      });
    }

    // Stitch Scene with Top HUD overlay + subtitles + transition SFX + Meera CTA in ONE SINGLE PASS
    const beatDurations = actualBeats.map(() => beatDuration);
    const sceneOutputFile = path.join(segDir, `scene_${scene.sceneNumber}_stitched.mp4`);
    await canvasEngine.stitchSceneClips(sceneClipPaths, voiceAudioPath, sceneOutputFile, {
      subtitleChunks,
      beatDurations,
      hudOverlayPath: hudBannerPath,
      characterPopIn,
      includeBgm: false
    });

    sceneFiles.push(sceneOutputFile);
  }

  // 5. Assemble Segment Master File (Voice + SFX only)
  const segmentMasterPath = path.join(segDir, `segment_${String(segmentIndex).padStart(2, '0')}_master.mp4`);
  await canvasEngine.assembleMasterVideo(sceneFiles, segmentMasterPath, { includeBgm: false });
  console.log(`✅ Segment #${segmentIndex} Complete (with Meera CTA): ${segmentMasterPath}`);

  return {
    segmentMasterPath,
    repoData,
    scriptData,
    fullPageResizedPath
  };
}
/**
 * Master Long-Form Compilation Video Driver (6–10 Minutes)
 */
async function runCompilationProduction(options = {}) {
  // Parse CLI args for Profile & Overrides
  const profileArg = process.argv.find(a => a.startsWith('--profile='))?.split('=')[1] || options.profile || process.env.ACTIVE_PROFILE || 'meera';
  const voiceArg = process.argv.find(a => a.startsWith('--voice='))?.split('=')[1] || options.voice;
  const brollArg = process.argv.find(a => a.startsWith('--broll='))?.split('=')[1] || options.broll;
  const langArg = process.argv.find(a => a.startsWith('--lang='))?.split('=')[1] || options.language || options.lang;

  const profileManager = new ProfileManager();
  const profile = await profileManager.loadProfile(profileArg, { voice: voiceArg, broll: brollArg, lang: langArg });

  const repoCount = options.repoCount || parseInt(process.env.REPO_COUNT || '5', 10);
  const scrapeMode = options.scrapeMode || process.env.SCRAPE_MODE || 'mixed';
  const timeframe = options.timeframe || process.env.TIMEFRAME || 'all';
  const language = langArg || profile.language || '';
  const privacyStatus = options.privacyStatus || process.env.YOUTUBE_PRIVACY_STATUS || 'public';
  const skipUpload = options.skipUpload ?? (process.argv.includes('--skip-upload') || process.argv.includes('--no-upload'));

  const totalProductionStart = Date.now();

  console.log('\n================================================================');
  console.log(`🚀 STARTING LONG-FORM COMPILATION VIDEO PRODUCTION (${repoCount} REPOSITORIES)`);
  console.log(`🎭 Profile: ${profile.name.toUpperCase()} (ID: ${profile.profileId})`);
  console.log(`⚙️ Mode: ${scrapeMode.toUpperCase()} | Language: ${profile.language.toUpperCase()} | Voice: ${profile.voice?.provider} | B-Roll: ${profile.broll?.engine}`);
  console.log(`⏱️ Start Timestamp: ${new Date(totalProductionStart).toLocaleTimeString()}`);
  console.log('================================================================\n');

  // Initialize Voice Engine dynamically (Google Vertex vs OmniVoice Cloned TTS)
  let ttsEngine;
  if (profile.voice?.provider === 'omnivoice') {
    ttsEngine = new OmniVoiceTTS(profile.voice);
  } else {
    ttsEngine = new GoogleVertexTTS(profile.voice);
  }

  // Initialize B-Roll Engine with Hybrid Motion Fetcher (Curated GIF Library + PlayPhrase Movie Clips)
  const brollFetcher = new HybridMotionFetcher({ playphrase: profile.broll || {} });

  // Shared Engines
  const sharedEngines = {
    profile,
    inspector: new GitHubRepoInspector(),
    cardRenderer: new GitHubCardRenderer(),
    scriptAgent: new GitHubScriptAgent(),
    pinterestFetcher: new PinterestImageFetcher(),
    gifFetcher: brollFetcher,
    ttsEngine,
    subRenderer: new SubtitleRenderer(),
    hudRenderer: new HUDOverlayRenderer(),
    characterAnimator: new CharacterCutoutAnimator({
      cutoutsDir: profile.resolved.cutoutsDir
    }),
    cursorAnimator: new ScreenStudioCursorAnimator(),
    canvasEngine: new FFmpegMotionCanvas({
      bgVideo: path.join(process.cwd(), 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4')
    })
  };

  if (sharedEngines.gifFetcher?.resetUsedClips) {
    sharedEngines.gifFetcher.resetUsedClips();
  }

  const trendingScraper = new GitHubTrendingScraper();
  const uncoveredList = await trendingScraper.fetchDeepUncoveredTrending({
    limit: repoCount,
    mode: scrapeMode,
    timeframe: timeframe,
    language: language
  });

  if (uncoveredList.length === 0) {
    const fallback = await trendingScraper.fetchTrendingRepos();
    uncoveredList.push(...fallback.slice(0, repoCount));
  }

  console.log(`📋 Selected ${uncoveredList.length} fresh uncovered repositories for compilation:`);
  uncoveredList.forEach((r, idx) => console.log(`   ${idx + 1}. ${r.repo} (★ ${r.totalStars}, ${r.language})`));

  const compilationId = `compilation_${Date.now()}`;
  const baseOutputDir = path.join(process.cwd(), 'data', 'videos');
  const compDir = path.join(baseOutputDir, compilationId);
  await fs.mkdir(compDir, { recursive: true });

  const useCloudRender = options.useCloud ?? (process.argv.includes('--cloud') || process.env.USE_CLOUD_RENDER === 'true');
  let finalMasterVideoPath = path.join(compDir, `master_compilation_${repoCount}_repos_1080p.mp4`);

  if (useCloudRender) {
    console.log(`\n☁️ [CLOUD RENDER MODE] Offloading all video rendering to Google Cloud Run (16 vCPU)...`);
    
    // 1. Generate Intro Script & Audio
    console.log(`🎙️ [PHASE 1] Generating Master Hook Teaser Intro Script & Voice...`);
    const introScript = await sharedEngines.scriptAgent.generateMasterCompilationIntro(uncoveredList);
    const audioDir = path.join(compDir, 'audio');
    await fs.mkdir(audioDir, { recursive: true });
    const introAudioPath = path.join(audioDir, 'intro_voice.mp3');
    if (!(await fs.stat(introAudioPath).catch(() => false))) {
      await sharedEngines.ttsEngine.synthesize(introScript.narration, introAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
    }
    
    // 2. Generate Segment Scripts & Voice Audio
    console.log(`🎙️ [PHASE 2] Generating Segment Scripts & Voice Audio for ${uncoveredList.length} Repositories...`);
    const segmentScripts = [];
    const audioFilesMap = { intro: introAudioPath, segments: [] };
    
    for (let idx = 0; idx < uncoveredList.length; idx++) {
      const repoData = uncoveredList[idx];
      console.log(`  📝 Scripting Segment #${idx + 1} (${sharedEngines.profile?.language || 'english'}): ${repoData.repo}...`);
      const scriptData = await sharedEngines.scriptAgent.generateNumberedRepoScript(repoData, repoData.description || '', idx + 1, uncoveredList.length, { language: sharedEngines.profile?.language });
      segmentScripts.push({ repoIndex: idx, scenes: scriptData.scenes });
      
      for (const scene of scriptData.scenes) {
        const voiceAudioPath = path.join(audioDir, `seg${idx + 1}_scene${scene.sceneNumber}.mp3`);
        if (!(await fs.stat(voiceAudioPath).catch(() => false))) {
          await sharedEngines.ttsEngine.synthesize(scene.narration, voiceAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName);
        }
        audioFilesMap.segments.push(voiceAudioPath);
      }
    }
    
    // 3. Generate Outro Script & Audio
    console.log(`🎙️ [PHASE 3] Generating Master Recap Outro Script & Voice...`);
    const outroScript = await sharedEngines.scriptAgent.generateMasterCompilationOutro(uncoveredList);
    const outroAudioPath = path.join(audioDir, 'outro_voice.mp3');
    if (!(await fs.stat(outroAudioPath).catch(() => false))) {
      await sharedEngines.ttsEngine.synthesize(outroScript.narration, outroAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
    }
    audioFilesMap.outro = outroAudioPath;
    
    // 4. Fetch Action GIFs
    console.log(`🎞️ [PHASE 4] Downloading Action GIFs...`);
    const gifsDir = path.join(compDir, 'gifs');
    await fs.mkdir(gifsDir, { recursive: true });
    const gifFilesList = [];
    for (let i = 0; i < uncoveredList.length + 2; i++) {
      const gifOut = path.join(gifsDir, `action_gif_${i + 1}.gif`);
      if (!(await fs.stat(gifOut).catch(() => false))) {
        await sharedEngines.gifFetcher.fetchMotionLoop('futuristic cyber matrix code technology', gifOut);
      }
      gifFilesList.push(gifOut);
    }
    
    // 5. Upload Payload to GCS & Trigger Cloud Run
    console.log(`🚀 [PHASE 5] Triggering Cloud Run Serverless Render Worker...`);
    const cloudClient = new CloudRenderClient();
    await cloudClient.uploadJobPayload(compilationId, {
      jobId: compilationId,
      repos: uncoveredList,
      scripts: { intro: introScript, segments: segmentScripts, outro: outroScript },
      audioFiles: audioFilesMap,
      gifFiles: gifFilesList
    });
    
    console.log(`⏳ Waiting for Cloud Run rendering...`);
    const renderResult = await cloudClient.triggerRender(compilationId);
    console.log(`✅ Cloud Run Render Complete in ${renderResult.duration}s!`);
    
    console.log(`📥 Downloading finished 1080p master video from GCS...`);
    await cloudClient.downloadRenderedVideo(compilationId, finalMasterVideoPath);
    console.log(`✅ Master Video Downloaded: ${finalMasterVideoPath}`);
  } else {
    // Local rendering mode (fallback)
    // 1. Generate Master Teaser Intro (Dynamic B-Roll Montage: Full-Screen Studio Glimpses + Tech Action GIFs)
    console.log(`\n🎙️ [PHASE 1] Generating Master Hook Teaser Intro (Dynamic B-Roll Montage)...`);
    const introScript = await sharedEngines.scriptAgent.generateMasterCompilationIntro(uncoveredList);
    const introAudioPath = path.join(compDir, 'intro_voice.mp3');
    await sharedEngines.ttsEngine.synthesize(introScript.narration, introAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
    const introDuration = await getAudioDuration(introAudioPath);
    const introSubs = await sharedEngines.subRenderer.renderTimedSubtitleChunks(introScript.narration, introDuration, path.join(compDir, 'intro_subs'), 'intro');
    const introClipPaths = [];
    const introBeats = [];
    introBeats.push({ type: 'action_gif', query: 'futuristic matrix hacker cyberpunk technology code' });

    const previewCount = Math.min(4, uncoveredList.length);
    for (let i = 0; i < previewCount; i++) {
      const repo = uncoveredList[i];
      const sliceOffsets = [0.0, 4.0, 7.0, 2.0];
      const offset = sliceOffsets[i % sliceOffsets.length];
      introBeats.push({ type: 'studio_glimpse', repo, startSec: offset });
      if (i === 1) {
        introBeats.push({ type: 'action_gif', query: 'futuristic cyber neural network ai technology' });
      }
    }

    const introBeatDur = Math.max(1.0, introDuration / introBeats.length);
    console.log(`  🎞️ Assembling ${introBeats.length} randomized B-Roll teaser clips (${introBeatDur.toFixed(2)}s each, perfectly matching ${introDuration.toFixed(2)}s voiceover)...`);

    for (let i = 0; i < introBeats.length; i++) {
      const beat = introBeats[i];
      const clipOut = path.join(compDir, `intro_broll_${i + 1}.mp4`);

      try {
        if (beat.type === 'studio_glimpse') {
          console.log(`    🖱️ [Intro B-Roll ${i + 1}/${introBeats.length}] Studio Glimpse (Offset ${beat.startSec.toFixed(1)}s): ${beat.repo.repo}...`);
          await sharedEngines.cursorAnimator.renderScreenStudioDemoClip({
            repoName: beat.repo.repo,
            repoUrl: `https://github.com/${beat.repo.repo}`,
            outputMp4Path: clipOut,
            duration: introBeatDur,
            starCount: beat.repo.totalStars
          });
        } else {
          const rawPath = path.join(compDir, `intro_raw_${i + 1}.mp4`);
          console.log(`    ⚡ [Intro B-Roll ${i + 1}/${introBeats.length}] Action Cinema B-Roll: "${beat.query}"...`);
          const acquired = await sharedEngines.gifFetcher.fetchMotionLoop(beat.query, rawPath, { duration: introBeatDur });
          await sharedEngines.canvasEngine.formatToFloatingCard(acquired, introBeatDur, clipOut, { motionIndex: i % 4 });
        }
      } catch (beatErr) {
        console.warn(`    ⚠️ B-Roll ${i + 1} fallback (${beatErr.message}). Generating fallback card...`);
        const fallbackRaw = path.join(compDir, `fallback_raw_${i + 1}.png`);
        await sharp({
          create: { width: 1920, height: 1080, channels: 4, background: { r: 15, g: 20, b: 30, alpha: 1 } }
        }).png().toFile(fallbackRaw);
        await sharedEngines.canvasEngine.formatToFloatingCard(fallbackRaw, introBeatDur, clipOut, { motionIndex: i % 4 });
      }
      introClipPaths.push(clipOut);
    }

    const masterIntroPath = path.join(compDir, 'master_intro.mp4');
    await sharedEngines.canvasEngine.stitchSceneClips(introClipPaths, introAudioPath, masterIntroPath, {
      subtitleChunks: introSubs,
      beatDurations: introClipPaths.map(() => introBeatDur),
      includeBgm: false
    });
    console.log(`✅ Master Teaser Intro B-Roll Montage Ready!`);

    // 2. Render Numbered Segments
    const segmentResults = [];
    const segmentMasterPaths = [];
    for (let idx = 0; idx < uncoveredList.length; idx++) {
      const repoData = uncoveredList[idx];
      const segmentResult = await renderNumberedRepoSegment({
        repoData,
        segmentIndex: idx + 1,
        totalSegments: uncoveredList.length,
        baseOutputDir: compDir,
        sharedEngines
      });
      segmentResults.push(segmentResult);
      segmentMasterPaths.push(segmentResult.segmentMasterPath);
      await trendingScraper.recordCoveredRepo(repoData, segmentResult.segmentMasterPath);
    }

    // 3. Generate Master Recap Outro
    console.log(`\n🎙️ [PHASE 3] Generating Master Recap Outro...`);
    const outroScript = await sharedEngines.scriptAgent.generateMasterCompilationOutro(uncoveredList);
    const outroAudioPath = path.join(compDir, 'outro_voice.mp3');
    await sharedEngines.ttsEngine.synthesize(outroScript.narration, outroAudioPath, sharedEngines.profile?.voice?.voiceId || sharedEngines.profile?.voice?.voiceName || 'en-GB-Chirp3-HD-Aoede');
    const outroDuration = await getAudioDuration(outroAudioPath);
    const outroSubs = await sharedEngines.subRenderer.renderTimedSubtitleChunks(outroScript.narration, outroDuration, path.join(compDir, 'outro_subs'), 'outro');

    const outroClipPaths = [];
    const repoShowcaseDuration = outroDuration / segmentResults.length;

    for (let i = 0; i < segmentResults.length; i++) {
      const seg = segmentResults[i];
      const clipOut = path.join(compDir, `outro_showcase_${i + 1}.mp4`);
      const segScreenshot = seg.fullPageResizedPath;
      
      if (segScreenshot && await fs.stat(segScreenshot).then(() => true).catch(() => false)) {
        console.log(`  📸 [Outro Showcase ${i + 1}/${segmentResults.length}] Displaying ${seg.repoData.repo} Summary Card (${repoShowcaseDuration.toFixed(1)}s)...`);
        await sharedEngines.cardRenderer.renderFullScreen3DPanTiltClip({
          fullPageResizedPath: segScreenshot,
          outputMp4Path: clipOut,
          duration: repoShowcaseDuration,
          repoName: seg.repoData.repo,
          starCount: seg.repoData.totalStars,
          sectionLabel: 'FEATURED RECAP',
          startY: 0,
          scrollDistance: 350
        });
      } else {
        const rawPath = path.join(compDir, `outro_raw_${i + 1}.mp4`);
        const acquired = await sharedEngines.gifFetcher.fetchMotionLoop('cyberpunk neon matrix code', rawPath);
        await sharedEngines.canvasEngine.formatToFloatingCard(acquired, repoShowcaseDuration, clipOut, { motionIndex: i });
      }
      outroClipPaths.push(clipOut);
    }

    const masterOutroPath = path.join(compDir, 'master_outro.mp4');
    await sharedEngines.canvasEngine.stitchSceneClips(outroClipPaths, outroAudioPath, masterOutroPath, {
      subtitleChunks: outroSubs,
      beatDurations: outroClipPaths.map(() => repoShowcaseDuration),
      includeBgm: false
    });
    console.log(`✅ Master Recap Outro Ready!`);

    // 4. Stitch Master Long-Form Video with Continuous Random-Offset 60-Minute BGM
    console.log(`\n🔗 [PHASE 4] Assembling Final Long-Form Master 1080p Video with Continuous BGM...`);
    const allMasterPieces = [masterIntroPath, ...segmentMasterPaths, masterOutroPath];
    
    await sharedEngines.canvasEngine.assembleMasterVideo(allMasterPieces, finalMasterVideoPath, {
      includeBgm: true,
      bgmVolume: 0.18
    });
    console.log(`✅ Master Long-Form 1080p Video Ready (All Meera CTAs seamlessly integrated)!`);
  }

  // 6. Generate High-CTR Clickbait Title + SEO Metadata Package
  console.log(`\n🎯 [PHASE 6] Generating Master SEO Package & Viral Title...`);
  const metaPackage = await sharedEngines.scriptAgent.generateMasterCompilationMetadata(uncoveredList);
  const videoTitle = metaPackage.title;
  console.log(`🎯 Generated YouTube Title: "${videoTitle}"`);

  // 7. Generate Multi-Archetype 16:9 Thumbnail via Vertex AI Nano Banana 2 (Paired with Title & News)
  console.log(`\n🖼️ [PHASE 7] Generating Auto-Picked 16:9 Thumbnail (Nano Banana 2 / Character Sheet)...`);
  const thumbnailDesigner = new ThumbnailDesignerAgent(null, { profile: sharedEngines.profile });
  const masterThumbnailPath = path.join(compDir, 'master_thumbnail.png');
  
  let thumbResult = null;
  try {
    thumbResult = await thumbnailDesigner.generateThumbnail({
      title: videoTitle,
      repo: uncoveredList[0]?.repo || 'Trending GitHub AI',
      description: metaPackage.hookHookLine || uncoveredList[0]?.description,
      hookTitle: videoTitle,
      narration: uncoveredList.map(r => `${r.repo}: ${r.description || ''}`).join('\n')
    }, masterThumbnailPath);

    // Apply 6-Repository 3x2 Liquid Glass link grid badge to Master Thumbnail
    try {
      const { applyLiquidGlassPill } = require('./src/media/visualStyleRandomizer.js');
      await applyLiquidGlassPill({
        imagePath: masterThumbnailPath,
        outputPath: masterThumbnailPath,
        multiRepos: uncoveredList
      });
      console.log(`✨ Applied 6-Repo Liquid Glass link grid to Master Thumbnail`);
    } catch (pillErr) {
      console.warn(`Liquid Glass Pill Overlay warning: ${pillErr.message}`);
    }

    console.log(`✅ Master Thumbnail Ready [Archetype: ${thumbResult?.archetypeId || 'custom'}]: ${masterThumbnailPath}`);
  } catch (thumbErr) {
    console.warn(`Thumbnail Generation Warning: ${thumbErr.message}`);
  }

  // 8. Upload Master Video + Thumbnail to YouTube as Unlisted
  console.log(`\n🚀 [PHASE 8] Uploading Master Video & Thumbnail to YouTube [UNLISTED]...`);
  const uploader = new YouTubeUploader();

  let videoDesc = `${metaPackage.hookHookLine || 'Explore the top trending open-source AI projects taking over GitHub right now.'}\n\n`;
  videoDesc += `📌 Featured Repositories:\n`;
  uncoveredList.forEach((r, idx) => {
    videoDesc += `${idx + 1}. ${r.repo} (★ ${r.totalStars})\n   🔗 https://github.com/${r.repo}\n   ${r.description || ''}\n\n`;
  });
  
  videoDesc += `⚡ Chapters:\n0:00 - Introduction & Hook\n`;
  let chapterTime = 20;
  uncoveredList.forEach((r, idx) => {
    const mins = Math.floor(chapterTime / 60);
    const secs = String(chapterTime % 60).padStart(2, '0');
    videoDesc += `${mins}:${secs} - #${idx + 1} ${r.repo.split('/')[1] || r.repo}\n`;
    chapterTime += 45;
  });
  const outroMins = Math.floor(chapterTime / 60);
  const outroSecs = String(chapterTime % 60).padStart(2, '0');
  videoDesc += `${outroMins}:${outroSecs} - Final Recap & Outro\n\n`;

  if (metaPackage.seoKeywords && metaPackage.seoKeywords.length > 0) {
    videoDesc += `🔑 Topics Covered:\n${metaPackage.seoKeywords.map(k => `• ${k}`).join('\n')}\n\n`;
  }

  videoDesc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  videoDesc += `🌐 junoverseai.com — Main portfolio\n`;
  videoDesc += `🛠️ www.mictab.com — All-in-one utilities\n`;
  videoDesc += `📥 downloadagent.junoverseai.com — Juno Download Agent\n`;
  videoDesc += `📱 autosmsai.junoverseai.com — Auto SMS AI\n`;
  videoDesc += `🔍 aidomain.junoverseai.com — AI Domain Search\n`;
  videoDesc += `📣 autofb.junoverseai.com — Full Social Automation - FB, IG, YT (Chat, Comment, Content Posting, Text, Image, Video)\n`;
  videoDesc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  videoDesc += `🔔 Subscribe for daily open-source AI tool breakdowns!\n#GitHub #AI #OpenSource #Programming #Developers #Tech`;

  const tags = metaPackage.tags && metaPackage.tags.length > 0 ? metaPackage.tags : [
    'github trending',
    'open source ai',
    'ai tools 2026',
    'developer tools',
    'top github repos',
    'artificial intelligence',
    'coding tools',
    'python ai'
  ];

  let uploadResult = null;
  if (!skipUpload) {
    try {
      uploadResult = await uploader.uploadVideo({
        videoPath: finalMasterVideoPath,
        thumbnailPath: (await fs.stat(masterThumbnailPath).then(() => true).catch(() => false)) ? masterThumbnailPath : null,
        title: videoTitle,
        description: videoDesc,
        tags: tags,
        privacyStatus: privacyStatus,
        categoryId: '28'
      });
    } catch (uploadErr) {
      console.error(`YouTube Upload Error: ${uploadErr.message}`);
    }
  } else {
    console.log(`⏩ [PHASE 8] Skipping YouTube Upload (--skip-upload flag active).`);
  }

  // 9. Permanent Storage Archive on External Drive
  try {
    const archiveBaseDir = path.join(baseOutputDir, 'archive');
    await fs.mkdir(archiveBaseDir, { recursive: true });

    const safeTitleSlug = videoTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 45);
    const dateStamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19).replace('T', '_');
    const archiveFolder = path.join(archiveBaseDir, `${dateStamp}_${safeTitleSlug}`);
    await fs.mkdir(archiveFolder, { recursive: true });

    const archivedVideoPath = path.join(archiveFolder, 'master_video_1080p.mp4');
    const archivedThumbPath = path.join(archiveFolder, 'thumbnail_16x9.png');
    const metadataTextPath = path.join(archiveFolder, 'metadata.txt');
    const metadataJsonPath = path.join(archiveFolder, 'info.json');

    // Copy master video & thumbnail
    await fs.copyFile(finalMasterVideoPath, archivedVideoPath);
    if (await fs.stat(masterThumbnailPath).then(() => true).catch(() => false)) {
      await fs.copyFile(masterThumbnailPath, archivedThumbPath);
    }

    // Build clean human-readable Notepad metadata.txt
    const metadataContent = [
      `================================================================`,
      `YOUTUBE PRODUCTION ARCHIVE`,
      `================================================================`,
      `TITLE: ${videoTitle}`,
      `DATE: ${new Date().toLocaleString()}`,
      `STATUS: ${uploadResult ? uploadResult.privacyStatus.toUpperCase() : 'RENDERED'}`,
      `YOUTUBE URL: ${uploadResult ? uploadResult.youtubeUrl : 'N/A'}`,
      `VIDEO ID: ${uploadResult ? uploadResult.videoId : 'N/A'}`,
      `================================================================`,
      ``,
      `DESCRIPTION & TIMESTAMPS:`,
      videoDesc,
      ``,
      `TAGS / KEYWORDS:`,
      tags.join(', '),
      ``,
      `FEATURED REPOSITORIES:`,
      ...uncoveredList.map((r, i) => `${i + 1}. ${r.repo} (★ ${r.totalStars || r.stars}, ${r.language || 'N/A'})\n   URL: https://github.com/${r.repo}\n   Summary: ${r.description || ''}\n`)
    ].join('\n');

    await fs.writeFile(metadataTextPath, metadataContent, 'utf8');
    await fs.writeFile(metadataJsonPath, JSON.stringify({
      title: videoTitle,
      youtubeUrl: uploadResult?.youtubeUrl || null,
      videoId: uploadResult?.videoId || null,
      privacyStatus: uploadResult?.privacyStatus || privacyStatus,
      description: videoDesc,
      tags,
      featuredRepos: uncoveredList,
      archivedVideoPath,
      archivedThumbPath,
      createdAt: new Date().toISOString()
    }, null, 2), 'utf8');

    console.log(`💾 Permanent Storage Archive Created: ${archiveFolder}`);
  } catch (archiveErr) {
    console.warn(`Archive Warning: ${archiveErr.message}`);
  }

  // 10. Multi-Platform Social Broadcast: Native Video Upload + 10-Min Thumbnail Recap
  try {
    console.log('\n📡 Broadcasting compilation release across social platforms (Buffer)...');
    const { UniversalPublisher } = require('./src/publishers/universalPublisher.js');
    const publisher = new UniversalPublisher();

    const repoBulletList = uncoveredList.map((r, i) => `${i + 1}. ${r.repo} (★ ${r.totalStars || r.stars || '1k+'}) — ${r.description || 'Open-source breakthrough'}`).join('\n');
    const repoLinks = uncoveredList.map((r, i) => `${i + 1}. https://github.com/${r.repo}`).join('\n');
    const ytLink = uploadResult?.youtubeUrl || 'https://youtube.com/@johon_tech';

    // WAVE 1: Native MP4 Video Upload to X.com & LinkedIn (Immediate)
    console.log('🎥 [Wave 1] Uploading native MP4 video directly to X.com and LinkedIn...');
    const videoPostTwitter = `These ${uncoveredList.length} secret GitHub repositories will save you thousands on AI subscriptions.\n\nWatch the full breakdown below 👇`;
    const videoPostLinkedIn = `Stop paying monthly subscriptions for software that exists for free.\n\nHere is a complete video breakdown of ${uncoveredList.length} brand-new open-source tools that feel almost illegal to know:\n\n${repoBulletList}\n\nWatch the full video below 👇\n\nYouTube 4K Edition: ${ytLink}`;

    const videoBroadcastRes = await publisher.broadcast({
      twitterText: videoPostTwitter,
      linkedInText: videoPostLinkedIn,
      mediaPath: finalMasterVideoPath,
      platforms: ['twitter', 'linkedin', 'facebook', 'instagram', 'threads'],
      mode: 'shareNow'
    });
    console.log('✅ [Wave 1] Native video broadcast dispatched:', JSON.stringify(videoBroadcastRes, null, 2));

    // WAVE 2: Master Thumbnail + Detailed 6-Repo Breakdown Post (10 Minutes Later)
    console.log('🖼️ [Wave 2] Scheduling Master Thumbnail recap post (10-minute follow-up)...');
    const thumbPostTwitter = `Top ${uncoveredList.length} Open-Source Breakthroughs from this week:\n\n${uncoveredList.map((r, i) => `${i + 1}. ${r.repo}`).join('\n')}\n\nFull deep-dive & links in thread! 🧵`;
    const thumbPostLinkedIn = `Here are the top ${uncoveredList.length} open-source repositories from this week's AI research:\n\n${repoBulletList}\n\n🔗 All repository source links:\n${repoLinks}\n\nWhich of these are you testing first? Drop your thoughts below! 👇`;

    const thumbDueAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const thumbBroadcastRes = await publisher.broadcast({
      twitterText: thumbPostTwitter,
      linkedInText: thumbPostLinkedIn,
      mediaPath: masterThumbnailPath,
      platforms: ['twitter', 'linkedin', 'facebook', 'instagram', 'threads'],
      mode: 'customScheduled',
      dueAt: thumbDueAt
    });
    console.log('✅ [Wave 2] Thumbnail recap post scheduled for +10m:', JSON.stringify(thumbBroadcastRes, null, 2));
  } catch (socialErr) {
    console.warn(`⚠️ Social broadcast warning: ${socialErr.message}`);
  }

  const totalElapsedMs = Date.now() - totalProductionStart;
  const totalMinutes = Math.floor(totalElapsedMs / 60000);
  const totalSeconds = Math.floor((totalElapsedMs % 60000) / 1000);
  const formattedDuration = `${totalMinutes}m ${totalSeconds}s`;

  console.log('\n================================================================');
  console.log('🎉 LONG-FORM COMPILATION VIDEO & YOUTUBE PRODUCTION COMPLETE!');
  console.log(`⏱️ Total Pipeline Execution Time: ${formattedDuration} (${(totalElapsedMs / 1000).toFixed(1)}s)`);
  console.log(`📁 Final Master Video: ${finalMasterVideoPath}`);
  if (thumbResult) console.log(`🖼️ Thumbnail: ${masterThumbnailPath}`);
  if (uploadResult) {
    console.log(`🔴 YouTube Live URL: ${uploadResult.youtubeUrl} [${uploadResult.privacyStatus.toUpperCase()}]`);
    console.log(`🆔 YouTube Video ID: ${uploadResult.videoId}`);
  }
  console.log(`⭐ Featured ${uncoveredList.length} Repositories`);
  console.log('================================================================\n');

  return { finalMasterVideoPath, masterThumbnailPath, uploadResult, uncoveredList, formattedDuration, totalElapsedMs };
}

if (require.main === module) {
  // Parse flexible CLI arguments:
  // Examples:
  //   node create_compilation_video.js 6
  //   node create_compilation_video.js 8 trending daily --public
  //   node create_compilation_video.js --count=6 --mode=mixed --privacy=public
  const args = process.argv.slice(2);
  let repoCount = 6;
  let scrapeMode = 'mixed';
  let timeframe = 'all';
  let language = '';
  let privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || 'public';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--count=')) {
      repoCount = parseInt(arg.split('=')[1], 10) || 6;
    } else if (arg.startsWith('--mode=')) {
      scrapeMode = arg.split('=')[1];
    } else if (arg.startsWith('--timeframe=')) {
      timeframe = arg.split('=')[1];
    } else if (arg.startsWith('--lang=') || arg.startsWith('--language=')) {
      language = arg.split('=')[1];
    } else if (arg === '--public' || arg === '--privacy=public') {
      privacyStatus = 'public';
    } else if (arg === '--unlisted' || arg === '--privacy=unlisted') {
      privacyStatus = 'unlisted';
    } else if (arg.startsWith('--privacy=')) {
      privacyStatus = arg.split('=')[1];
    } else if (i === 0 && !isNaN(parseInt(arg, 10))) {
      repoCount = parseInt(arg, 10);
    } else if (i === 1 && !arg.startsWith('--')) {
      scrapeMode = arg;
    } else if (i === 2 && !arg.startsWith('--')) {
      timeframe = arg;
    } else if (i === 3 && !arg.startsWith('--')) {
      language = arg;
    }
  }
  
  const skipUpload = args.includes('--skip-upload') || args.includes('--no-upload');
  
  runCompilationProduction({ repoCount, scrapeMode, timeframe, language, privacyStatus, skipUpload }).catch(err => {
    console.error('Fatal Compilation Error:', err);
    process.exit(1);
  });
}

module.exports = { runCompilationProduction, renderNumberedRepoSegment };
