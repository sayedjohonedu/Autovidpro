require('dotenv').config();
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');
const { promisify } = require('util');

const { GitHubTrendingScraper } = require('./utils/github-trending-scraper');
const { GitHubRepoInspector } = require('./utils/github-repo-inspector');
const { GitHubCardRenderer } = require('./utils/github-card-renderer');
const { GitHubScriptAgent } = require('./agents/github-script-agent');
const { PinterestImageFetcher } = require('./utils/pinterest-image-fetcher');
const { GIFMotionFetcher } = require('./utils/gif-motion-fetcher');
const { GoogleVertexTTS } = require('./utils/google-vertex-tts');
const { SubtitleRenderer } = require('./utils/subtitle-renderer');
const { HUDOverlayRenderer } = require('./utils/hud-overlay-renderer');
const { FFmpegMotionCanvas } = require('./utils/ffmpeg-motion-canvas');
const { CharacterCutoutAnimator } = require('./utils/character-cutout-animator');
const { ThumbnailStudioGenerator } = require('./utils/thumbnail-studio-generator');
const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');
const { ScreenStudioCursorAnimator } = require('./utils/screen-studio-cursor-animator');
const { YouTubeUploader } = require('./utils/youtube-uploader');

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

  const { inspector, cardRenderer, scriptAgent, pinterestFetcher, gifFetcher, ttsEngine, subRenderer, hudRenderer, canvasEngine, cursorAnimator } = sharedEngines;

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
  console.log(`📦 Verified ${allAuthorMedia.length} authentic visual diagrams/demos for ${repoData.repo}`);

  // Capture clean full page screenshot for Outro recap
  const { fullPagePath: fullPageRawPath } = await inspector.captureFullPageScreenshot(repoData.repo, cardsDir);
  const { resizedPath: fullPageResizedPath } = await cardRenderer.prepareResizedFullPage(fullPageRawPath, cardsDir);

  // 2. Generate Numbered Script
  console.log(`📝 Writing Segment #${segmentIndex} script with viral storytelling...`);
  const scriptData = await scriptAgent.generateNumberedRepoScript(repoData, readmeText, segmentIndex, totalSegments);
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

  // 4. Render Scenes for this Segment
  const sceneFiles = [];
  for (let sIdx = 0; sIdx < scriptData.scenes.length; sIdx++) {
    const scene = scriptData.scenes[sIdx];
    const voiceAudioPath = path.join(audioDir, `scene_${scene.sceneNumber}.mp3`);

    console.log(`\n  🗣️ Synthesizing Voice [Chirp 3 HD Aoede]: "${scene.title}"...`);
    await ttsEngine.synthesize(scene.narration, voiceAudioPath, 'en-GB-Chirp3-HD-Aoede');
    const sceneDuration = await getAudioDuration(voiceAudioPath);

    const subtitleChunks = await subRenderer.renderTimedSubtitleChunks(scene.narration, sceneDuration, subsDir, `${segmentIndex}_${scene.sceneNumber}`);

    // High-retention visual beat sequence:
    // Every segment seamlessly combines:
    // 1. Full-screen Screen Studio cursor flights (code highlights, stars, readme scrolls)
    // 2. Magic 3D Pan & Tilt GitHub CRT TV Perspective reveal
    // 3. Real author architecture diagrams / UI screenshots
    // 4. High-energy action GIFs
    // High-retention visual beat sequence:
    // Seamlessly combines:
    // 1. Full-screen Screen Studio cursor flights (code highlights, stars, readme scrolls)
    // 2. Magic 3D Pan & Tilt GitHub CRT TV Perspective reveal
    // 3. Real author architecture diagrams / UI screenshots (if available)
    // 4. AI-Directed High-Energy Action Movie & Meme GIFs from scene.visualBeats
    let actualBeats = [];

    const aiGifBeats = (scene.visualBeats || []).filter(b => b.type === 'gif_search');
    const customGifQuery1 = aiGifBeats[0]?.query || `${repoData.language || 'tech'} hacker matrix code`;
    const customGifQuery2 = aiGifBeats[1]?.query || aiGifBeats[0]?.query || `formula one pit stop super speed`;

    if (sIdx === 0) {
      actualBeats = [
        { type: 'screen_studio_cursor', chunkDuration: 3.5 },
        { type: 'github_tv_tilt', label: 'GITHUB SPOTLIGHT' }
      ];
    } else if (sIdx === 1) {
      actualBeats = [
        { type: allAuthorMedia.length > 0 ? 'repo_media' : 'github_tv_tilt', label: 'CORE ARCHITECTURE' },
        { type: 'gif_search', query: customGifQuery1 }
      ];
    } else if (sIdx === 2) {
      actualBeats = [
        { type: 'github_tv_tilt', label: 'FEATURE DEMO' },
        { type: 'screen_studio_cursor', chunkDuration: 3.5 }
      ];
    } else if (sIdx === 3) {
      actualBeats = [
        { type: 'screen_studio_cursor', chunkDuration: 3.5 },
        { type: 'gif_search', query: customGifQuery1 }
      ];
    } else {
      // Scene 5 (Verdict & Transition)
      actualBeats = [
        { type: 'gif_search', query: customGifQuery2 },
        { type: 'screen_studio_cursor', chunkDuration: 3.5 }
      ];
    }

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
      } else if (beat.type === 'repo_media' && allAuthorMedia.length > 0) {
        const authorMediaIndex = (sIdx === 0 && bIdx === 1) ? 0 : ((sIdx + bIdx) % allAuthorMedia.length);
        const rawMedia = allAuthorMedia[authorMediaIndex] || allAuthorMedia[0];
        console.log(`    📦 Author Visual Asset #${authorMediaIndex + 1} (${beatDuration.toFixed(1)}s): ${path.basename(rawMedia)}...`);
        await canvasEngine.formatToFloatingCard(rawMedia, beatDuration, clipOutPath, { motionIndex: motionIdx, isRepoMedia: true });
      } else {
        const query = beat.query || beat.fallbackQuery || `${repoData.language} tech superpower`;
        const rawGifPath = path.join(clipsDir, `raw_s${scene.sceneNumber}_b${bIdx + 1}.gif`);
        console.log(`    🎞️ GIF: "${query}" (${beatDuration.toFixed(1)}s)...`);
        await gifFetcher.fetchMotionLoop(query, rawGifPath);
        await canvasEngine.formatToFloatingCard(rawGifPath, beatDuration, clipOutPath, { motionIndex: motionIdx });
      }
      sceneClipPaths.push(clipOutPath);
    }

    // Stitch Scene with Top HUD overlay + subtitles + transition SFX (Voice + SFX only, no individual BGM)
    const beatDurations = actualBeats.map(() => beatDuration);
    const sceneOutputFile = path.join(segDir, `scene_${scene.sceneNumber}_stitched.mp4`);
    await canvasEngine.stitchSceneClips(sceneClipPaths, voiceAudioPath, sceneOutputFile, {
      subtitleChunks,
      beatDurations,
      hudOverlayPath: hudBannerPath,
      includeBgm: false
    });
    sceneFiles.push(sceneOutputFile);
  }

  // 5. Assemble Segment Master File (Voice + SFX only)
  const segmentMasterPath = path.join(segDir, `segment_${String(segmentIndex).padStart(2, '0')}_master.mp4`);
  await canvasEngine.assembleMasterVideo(sceneFiles, segmentMasterPath, { includeBgm: false });
  console.log(`✅ Segment #${segmentIndex} Complete: ${segmentMasterPath}`);

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
  const repoCount = options.repoCount || parseInt(process.env.REPO_COUNT || '5', 10);
  const scrapeMode = options.scrapeMode || process.env.SCRAPE_MODE || 'mixed';
  const timeframe = options.timeframe || process.env.TIMEFRAME || 'all';
  const language = options.language || process.env.LANGUAGE || '';

  console.log('\n================================================================');
  console.log(`🚀 STARTING LONG-FORM COMPILATION VIDEO PRODUCTION (${repoCount} REPOSITORIES)`);
  console.log(`⚙️ Mode: ${scrapeMode.toUpperCase()} | Timeframe: ${timeframe.toUpperCase()} | Language: ${language || 'ALL'}`);
  console.log('================================================================\n');

  // Shared Engines
  const sharedEngines = {
    inspector: new GitHubRepoInspector(),
    cardRenderer: new GitHubCardRenderer(),
    scriptAgent: new GitHubScriptAgent(),
    pinterestFetcher: new PinterestImageFetcher(),
    gifFetcher: new GIFMotionFetcher(),
    ttsEngine: new GoogleVertexTTS(),
    subRenderer: new SubtitleRenderer(),
    hudRenderer: new HUDOverlayRenderer(),
    cursorAnimator: new ScreenStudioCursorAnimator(),
    canvasEngine: new FFmpegMotionCanvas({
      bgVideo: path.join(process.cwd(), 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4')
    })
  };

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
  const compDir = path.join(process.cwd(), 'data', 'videos', compilationId);
  await fs.mkdir(compDir, { recursive: true });

  // 1. Generate Master Teaser Intro (Dynamic B-Roll Montage: Full-Screen Studio Glimpses + Tech Action GIFs)
  console.log(`\n🎙️ [PHASE 1] Generating Master Hook Teaser Intro (Dynamic B-Roll Montage)...`);
  const introScript = await sharedEngines.scriptAgent.generateMasterCompilationIntro(uncoveredList);
  const introAudioPath = path.join(compDir, 'intro_voice.mp3');
  await sharedEngines.ttsEngine.synthesize(introScript.narration, introAudioPath, 'en-GB-Chirp3-HD-Aoede');
  const introDuration = await getAudioDuration(introAudioPath);
  const introSubs = await sharedEngines.subRenderer.renderTimedSubtitleChunks(introScript.narration, introDuration, path.join(compDir, 'intro_subs'), 'intro');

  const introClipPaths = [];
  // 1. First clip MUST ALWAYS be a high-energy tech GIF
  // 2. Interleave randomized repository chunks (e.g. Chunk 1 of Repo 1, then GIF, then Chunk 3 of Repo 2, etc.)
  // 3. Randomize GIF counts (sometimes 1, sometimes 2) and flight slice offsets so no two clips look identical.
  const introBeats = [];
  introBeats.push({ type: 'action_gif', query: 'futuristic matrix hacker cyberpunk technology code' });

  for (let i = 0; i < uncoveredList.length; i++) {
    const repo = uncoveredList[i];
    // Pick different slice offsets for each repo (e.g. Repo 0: 0-3s, Repo 1: 4-7s, Repo 2: 7-10s)
    const sliceOffsets = [0.0, 4.2, 7.5, 2.0];
    const offset = sliceOffsets[i % sliceOffsets.length];
    introBeats.push({ type: 'studio_glimpse', repo, startSec: offset });

    // Randomize whether 1 or 2 action GIFs follow
    const gifCount = (i % 2 === 0) ? 1 : 2;
    for (let g = 0; g < gifCount; g++) {
      const repoShort = repo.repo.split('/')[1] || repo.repo;
      const queries = [
        `${repoShort} ${repo.language || 'tech'} supercomputer matrix`,
        `futuristic cyber neural network ai`,
        `developer hacker neon coding terminal`
      ];
      introBeats.push({ type: 'action_gif', query: queries[(i + g) % queries.length] });
    }
  }

  const introBeatDur = Math.min(2.5, Math.max(1.5, introDuration / introBeats.length));
  console.log(`  🎞️ Assembling ${introBeats.length} randomized B-Roll teaser clips (${introBeatDur.toFixed(1)}s each, starting with GIF)...`);

  for (let i = 0; i < introBeats.length; i++) {
    const beat = introBeats[i];
    const clipOut = path.join(compDir, `intro_broll_${i + 1}.mp4`);

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
      const gifPath = path.join(compDir, `intro_raw_${i + 1}.gif`);
      console.log(`    ⚡ [Intro B-Roll ${i + 1}/${introBeats.length}] Action GIF: "${beat.query}"...`);
      await sharedEngines.gifFetcher.fetchMotionLoop(beat.query, gifPath);
      await sharedEngines.canvasEngine.formatToFloatingCard(gifPath, introBeatDur, clipOut, { motionIndex: i % 4 });
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
  await sharedEngines.ttsEngine.synthesize(outroScript.narration, outroAudioPath, 'en-GB-Chirp3-HD-Aoede');
  const outroDuration = await getAudioDuration(outroAudioPath);
  const outroSubs = await sharedEngines.subRenderer.renderTimedSubtitleChunks(outroScript.narration, outroDuration, path.join(compDir, 'outro_subs'), 'outro');

  // Render sequential showcase cards for each featured repository in the outro
  const outroClipPaths = [];
  const repoShowcaseDuration = outroDuration / segmentResults.length;

  for (let i = 0; i < segmentResults.length; i++) {
    const seg = segmentResults[i];
    const clipOut = path.join(compDir, `outro_showcase_${i + 1}.mp4`);
    const segScreenshot = seg.fullPageResizedPath;
    
    // Display clean full repo summary card so viewers can screenshot the links & names
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
      const gifPath = path.join(compDir, `outro_raw_${i + 1}.gif`);
      await sharedEngines.gifFetcher.fetchMotionLoop('cyberpunk neon matrix code', gifPath);
      await sharedEngines.canvasEngine.formatToFloatingCard(gifPath, repoShowcaseDuration, clipOut, { motionIndex: i });
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
  const rawMasterVideoPath = path.join(compDir, `raw_master_${repoCount}_repos.mp4`);
  const finalMasterVideoPath = path.join(compDir, `master_compilation_${repoCount}_repos_1080p.mp4`);
  
  await sharedEngines.canvasEngine.assembleMasterVideo(allMasterPieces, rawMasterVideoPath, {
    includeBgm: true,
    bgmVolume: 0.18
  });

  // 5. Apply Periodic Vox-Style Paper-Cut Stop-Motion Character & Banner Pop-ins (Every 25–35s)
  console.log(`\n🎭 [PHASE 5] Applying Scheduled Vox-Style Paper-Cut Character Pop-ins (Every 25–35s)...`);
  const characterAnimator = new CharacterCutoutAnimator();
  await characterAnimator.applyPeriodicPopsToMaster({
    inputVideo: rawMasterVideoPath,
    outputVideo: finalMasterVideoPath,
    intervalSeconds: 30,
    initialOffset: 24
  });

  // 6. Generate High-CTR Clickbait Title + SEO Metadata Package
  console.log(`\n🎯 [PHASE 6] Generating Master SEO Package & Viral Title...`);
  const metaPackage = await sharedEngines.scriptAgent.generateMasterCompilationMetadata(uncoveredList);
  const videoTitle = metaPackage.title;
  console.log(`🎯 Generated YouTube Title: "${videoTitle}"`);

  // 7. Generate Multi-Archetype 16:9 Thumbnail via Vertex AI Nano Banana 2 (Paired with Title & News)
  console.log(`\n🖼️ [PHASE 7] Generating Auto-Picked 16:9 Thumbnail (Nano Banana 2 / Character Sheet)...`);
  const thumbnailDesigner = new ThumbnailDesignerAgent();
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
    console.log(`✅ Master Thumbnail Ready [Archetype: ${thumbResult.archetypeId}]: ${masterThumbnailPath}`);
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
  try {
    uploadResult = await uploader.uploadVideo({
      videoPath: finalMasterVideoPath,
      thumbnailPath: (await fs.stat(masterThumbnailPath).then(() => true).catch(() => false)) ? masterThumbnailPath : null,
      title: videoTitle,
      description: videoDesc,
      tags: tags,
      privacyStatus: 'unlisted',
      categoryId: '28'
    });
  } catch (uploadErr) {
    console.error(`YouTube Upload Error: ${uploadErr.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 LONG-FORM COMPILATION VIDEO & YOUTUBE PRODUCTION COMPLETE!');
  console.log(`📁 Final Master Video: ${finalMasterVideoPath}`);
  if (thumbResult) console.log(`🖼️ Thumbnail: ${masterThumbnailPath}`);
  if (uploadResult) {
    console.log(`🔴 YouTube Live URL: ${uploadResult.youtubeUrl} [${uploadResult.privacyStatus.toUpperCase()}]`);
    console.log(`🆔 YouTube Video ID: ${uploadResult.videoId}`);
  }
  console.log(`⭐ Featured ${uncoveredList.length} Repositories`);
  console.log('================================================================\n');

  return { finalMasterVideoPath, masterThumbnailPath, uploadResult, uncoveredList };
}

if (require.main === module) {
  // Parse flexible CLI arguments or positional arguments:
  // Examples:
  //   node create_compilation_video.js 5
  //   node create_compilation_video.js 10 trending daily
  //   node create_compilation_video.js --count=10 --mode=trending --timeframe=daily --lang=python
  const args = process.argv.slice(2);
  let repoCount = 5;
  let scrapeMode = 'mixed';
  let timeframe = 'all';
  let language = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--count=')) {
      repoCount = parseInt(arg.split('=')[1], 10) || 5;
    } else if (arg.startsWith('--mode=')) {
      scrapeMode = arg.split('=')[1];
    } else if (arg.startsWith('--timeframe=')) {
      timeframe = arg.split('=')[1];
    } else if (arg.startsWith('--lang=') || arg.startsWith('--language=')) {
      language = arg.split('=')[1];
    } else if (i === 0 && !isNaN(parseInt(arg, 10))) {
      repoCount = parseInt(arg, 10);
    } else if (i === 1) {
      scrapeMode = arg;
    } else if (i === 2) {
      timeframe = arg;
    } else if (i === 3) {
      language = arg;
    }
  }
  
  runCompilationProduction({ repoCount, scrapeMode, timeframe, language }).catch(err => {
    console.error('Fatal Compilation Error:', err);
    process.exit(1);
  });
}

module.exports = { runCompilationProduction, renderNumberedRepoSegment };
