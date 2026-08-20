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
const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');

const execAsync = promisify(exec);

const { HybridMotionFetcher } = require('./utils/hybrid-motion-fetcher');

async function getAudioDuration(audioPath) {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
  const { stdout } = await execAsync(cmd);
  return parseFloat(stdout.trim()) || 10.0;
}

async function runGitHubTrendingProduction() {
  console.log('\n================================================================');
  console.log('🚀 STARTING VIRAL GITHUB SPOTLIGHT VIDEO PRODUCTION');
  console.log('================================================================\n');

  // 1. Fetch Top Uncovered Trending Repo
  console.log('🔎 [PHASE 1] Scraping GitHub Trending & Selecting Next Repo...');
  const trendingScraper = new GitHubTrendingScraper();
  const repoData = await trendingScraper.getTopUncoveredRepo();
  console.log(`⭐ Target Repo: ${repoData.repo} (★ ${repoData.totalStars} stars, +${repoData.starsToday} today)`);
  console.log(`📝 Description: "${repoData.description}"\n`);

  // Setup Output Folders
  const safeRepoName = repoData.repo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const projectDir = path.join(process.cwd(), 'data', 'videos', `github_trending_${safeRepoName}`);
  const audioDir = path.join(projectDir, 'audio');
  const subsDir = path.join(projectDir, 'subs');
  const clipsDir = path.join(projectDir, 'clips');
  const cardsDir = path.join(projectDir, 'cards');
  const pinImgDir = path.join(projectDir, 'pinterest_images');
  const readmeMediaDir = path.join(projectDir, 'readme_media');

  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(subsDir, { recursive: true });
  await fs.mkdir(clipsDir, { recursive: true });
  await fs.mkdir(cardsDir, { recursive: true });
  await fs.mkdir(pinImgDir, { recursive: true });
  await fs.mkdir(readmeMediaDir, { recursive: true });

  // 2. Inspect Repo, Discover Author Assets & Full-Page Screenshot
  console.log('📸 [PHASE 2] Harvesting README Media, Repo Tree Assets & Tall Screenshot...');
  const inspector = new GitHubRepoInspector();
  const cardRenderer = new GitHubCardRenderer();
  const { content: readmeText, branch } = await inspector.fetchReadme(repoData.repo);
  const readmeMediaUrls = inspector.extractReadmeMedia(readmeText, repoData.repo, branch);
  const downloadedReadmeMedia = await inspector.downloadReadmeMedia(readmeMediaUrls, readmeMediaDir);
  const treeDiscoveredMedia = await inspector.discoverRepoAssets(repoData.repo, readmeMediaDir, branch);
  console.log(`\n📸 [Phase 1/5] Capturing high-DPI tall screenshot & section cards with Playwright...`);
  const { fullPagePath: fullPageRawPath, sectionPaths } = await inspector.captureFullPageScreenshot(repoData.repo, cardsDir);
  const { resizedPath: fullPageResizedPath } = await cardRenderer.prepareResizedFullPage(fullPageRawPath, cardsDir);
  const allAuthorMedia = [...downloadedReadmeMedia, ...treeDiscoveredMedia, ...(sectionPaths || [])];
  console.log(`📦 Available authentic GitHub visuals for this repo: ${allAuthorMedia.length} assets`);

  // 3. Generate Numbered Script with Viral Storyteller Agent
  console.log('\n📝 [PHASE 3] Generating Numbered Script with Gemini 3.7 Flash...');
  const scriptAgent = new GitHubScriptAgent();
  const scriptData = await scriptAgent.generateNumberedRepoScript(repoData, readmeText, 1, 1);
  console.log(`🎬 Hook Title: "${scriptData.hookTitle}" (${scriptData.scenes.length} scenes)\n`);

  await fs.writeFile(path.join(projectDir, 'script.json'), JSON.stringify(scriptData, null, 2));

  // 4. Generate Top HUD Banner
  const hudRenderer = new HUDOverlayRenderer();
  const hudBannerPath = path.join(projectDir, 'top_hud_banner.png');
  await hudRenderer.generateTopHUDBanner({
    segmentNumber: 1,
    totalSegments: 1,
    hookTitle: scriptData.hookTitle,
    repoName: repoData.repo,
    starCount: repoData.totalStars,
    outputPath: hudBannerPath
  });
  console.log(`✨ Top HUD Banner Ready: ${hudBannerPath}`);

  // Initialize Engines
  const ttsEngine = new GoogleVertexTTS();
  const subRenderer = new SubtitleRenderer();
  const pinterestFetcher = new PinterestImageFetcher();
  const gifFetcher = new HybridMotionFetcher();
  const canvasEngine = new FFmpegMotionCanvas({
    bgVideo: path.join(process.cwd(), 'Assets', 'Backgrounds', 'vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4')
  });

  const sceneOutputFiles = [];
  if (gifFetcher?.resetUsedClips) {
    gifFetcher.resetUsedClips();
  }

  // 5. Render Scenes
  for (let sIdx = 0; sIdx < scriptData.scenes.length; sIdx++) {
    const scene = scriptData.scenes[sIdx];

    console.log(`\n========================================================`);
    console.log(`🎬 [SCENE ${scene.sceneNumber}/5] ${scene.title}`);
    console.log(`========================================================`);

    const voiceAudioPath = path.join(audioDir, `scene_${scene.sceneNumber}.mp3`);
    console.log(`\n  🗣️ [Scene ${scene.sceneNumber}/5] Synthesizing Voice [Chirp 3 HD Aoede]: "${scene.title}"...`);
    await ttsEngine.synthesize(scene.narration, voiceAudioPath, 'en-GB-Chirp3-HD-Aoede');
    const sceneDuration = await getAudioDuration(voiceAudioPath);
    console.log(`✅ Journey Voice Duration: ${sceneDuration.toFixed(1)}s`);

    // Subtitle Chunks
    const subtitleChunks = await subRenderer.renderTimedSubtitleChunks(scene.narration, sceneDuration, subsDir, scene.sceneNumber);

    // Visual Beats
    const maxBeatDuration = 3.5;
    let beats = scene.visualBeats || [];
    const requiredBeatCount = Math.max(beats.length, Math.ceil(sceneDuration / maxBeatDuration));
    const actualBeats = beats.slice(0, requiredBeatCount);
    const beatDuration = sceneDuration / actualBeats.length;
    const sceneClipPaths = [];

    console.log(`🎬 Visual Pace: ${actualBeats.length} cuts (${beatDuration.toFixed(2)}s per cut <= 3.5s)`);

    for (let bIdx = 0; bIdx < actualBeats.length; bIdx++) {
      const beat = actualBeats[bIdx];
      const clipOutPath = path.join(clipsDir, `clip_s${scene.sceneNumber}_b${bIdx + 1}.mp4`);

      if (beat.type === 'github_fullscreen_3d') {
        const sectionLabel = beat.label || (sIdx === 0 ? 'GITHUB SPOTLIGHT' : 'STAR ON GITHUB');
        const startY = sIdx === 0 ? 0 : 900;
        console.log(`\n  🖥️ [Beat ${bIdx + 1}/${actualBeats.length}] Rendering Full-Screen 3D Pan & Tilt [${sectionLabel}] (${beatDuration.toFixed(1)}s)...`);
        
        await cardRenderer.renderFullScreen3DPanTiltClip({
          fullPageResizedPath,
          outputMp4Path: clipOutPath,
          duration: beatDuration,
          repoName: repoData.repo,
          starCount: repoData.totalStars,
          sectionLabel,
          startY,
          scrollDistance: 750
        });
        sceneClipPaths.push(clipOutPath);
        console.log(`  ✅ Full-Screen 3D Pan & Tilt Clip Ready`);

      } else if (beat.type === 'repo_media' && allAuthorMedia.length > 0) {
        const motionIdx = (sIdx * 2 + bIdx) % 4;
        const authorMediaIndex = (sIdx === 0 && bIdx === 1) ? 0 : ((sIdx + bIdx) % allAuthorMedia.length);
        const rawMedia = allAuthorMedia[authorMediaIndex] || allAuthorMedia[0];
        console.log(`\n  📦 [Beat ${bIdx + 1}/${actualBeats.length}] Rendering Author Demo Asset #${authorMediaIndex + 1} (MotionProfile #${motionIdx}, ${beatDuration.toFixed(1)}s): ${path.basename(rawMedia)}...`);
        await canvasEngine.formatToFloatingCard(rawMedia, beatDuration, clipOutPath, { motionIndex: motionIdx });
        sceneClipPaths.push(clipOutPath);
        console.log(`  ✅ Author Demo Asset Ready`);

      } else if (beat.type === 'pinterest_image' && allAuthorMedia.length === 0) {
        const motionIdx = (sIdx * 2 + bIdx) % 4;
        const query = beat.query || `${repoData.language} computer science technology aesthetic`;
        const rawPinImgPath = path.join(pinImgDir, `pin_s${scene.sceneNumber}_b${bIdx + 1}.png`);
        console.log(`\n  📌 [Beat ${bIdx + 1}/${actualBeats.length}] Fetching Pinterest Aesthetic Image: "${query}" (${beatDuration.toFixed(1)}s)...`);
        await pinterestFetcher.fetchAestheticImage(query, rawPinImgPath);
        await canvasEngine.formatToFloatingCard(rawPinImgPath, beatDuration, clipOutPath, { motionIndex: motionIdx });
        sceneClipPaths.push(clipOutPath);
        console.log(`  ✅ Pinterest Aesthetic Image Ready`);

      } else {
        const motionIdx = (sIdx * 2 + bIdx) % 4;
        const query = beat.query || beat.fallbackQuery || `${repoData.language} tech superpower`;
        const rawGifPath = path.join(clipsDir, `raw_s${scene.sceneNumber}_b${bIdx + 1}.gif`);
        console.log(`\n  🎞️ [Beat ${bIdx + 1}/${actualBeats.length}] Searching Movie/Pop-Culture GIF: "${query}" (${beatDuration.toFixed(1)}s)...`);
        await gifFetcher.fetchMotionLoop(query, rawGifPath);
        await canvasEngine.formatToFloatingCard(rawGifPath, beatDuration, clipOutPath, { motionIndex: motionIdx });
        sceneClipPaths.push(clipOutPath);
        console.log(`  ✅ Movie/Pop-Culture GIF Ready`);
      }
    }

    // Stitch Scene with Top HUD Banner + 20% Transition SFX + Boosted BGM & Kinetic Subtitles
    const beatDurations = actualBeats.map(() => beatDuration);
    const sceneOutputFile = path.join(projectDir, `scene_${scene.sceneNumber}_complete.mp4`);
    console.log(`\n🔗 Stitching Scene ${scene.sceneNumber} with Top HUD Banner, 20% SFX & Boosted BGM...`);
    await canvasEngine.stitchSceneClips(sceneClipPaths, voiceAudioPath, sceneOutputFile, {
      subtitleChunks,
      beatDurations,
      hudOverlayPath: hudBannerPath,
      bgmVolume: 0.18
    });
    sceneOutputFiles.push(sceneOutputFile);
    console.log(`✅ Scene ${scene.sceneNumber} Master Ready!`);
  }

  // 6. Assemble Master Video
  console.log('\n========================================================');
  console.log('🔗 [PHASE 5] Assembling Final 1080p Master Video...');
  console.log('========================================================');
  const masterVideoPath = path.join(projectDir, `github_trending_${safeRepoName}_1080p.mp4`);
  await canvasEngine.assembleMasterVideo(sceneOutputFiles, masterVideoPath);

  // 7. Generate Multi-Archetype 16:9 Thumbnail (Grade 3 Hook + Character Sheet)
  console.log('\n🖼️ [PHASE 6] Generating Auto-Picked 16:9 Thumbnail (Nano Banana 2 / Character Sheet)...');
  const thumbnailDesigner = new ThumbnailDesignerAgent();
  const thumbnailPath = path.join(projectDir, `thumbnail_${safeRepoName}.png`);
  let thumbnailResult = null;
  try {
    thumbnailResult = await thumbnailDesigner.generateThumbnail({
      repo: repoData.repo,
      title: scriptData.scenes[0]?.heading || repoData.repo,
      description: repoData.description,
      hookTitle: scriptData.scenes[0]?.heading,
      narration: scriptData.scenes.map(s => s.narrationText).join(' ')
    }, thumbnailPath);
    console.log(`✅ Viral Thumbnail Ready [Archetype: ${thumbnailResult.archetypeId} | Hook: "${thumbnailResult.concept.hookText}"]: ${thumbnailPath}`);
  } catch (thumbErr) {
    console.warn(`Thumbnail Generation Warning: ${thumbErr.message}`);
  }

  // 8. Record to SQLite Database
  console.log('\n💾 [PHASE 7] Recording Repo to SQLite History Database...');
  await trendingScraper.recordCoveredRepo(repoData, masterVideoPath);

  console.log('\n================================================================');
  console.log('🎉 VIRAL GITHUB SPOTLIGHT VIDEO PRODUCTION COMPLETE!');
  console.log(`📁 Master Video: ${masterVideoPath}`);
  if (thumbnailResult) console.log(`🖼️ Master Thumbnail: ${thumbnailPath}`);
  console.log(`⭐ Featured Repo: ${repoData.repo} (★ ${repoData.totalStars})`);
  console.log('================================================================\n');

  return { masterVideoPath, thumbnailPath: thumbnailResult?.path, repoData, scriptData };
}

if (require.main === module) {
  runGitHubTrendingProduction().catch(err => {
    console.error('Fatal Production Error:', err);
    process.exit(1);
  });
}

module.exports = { runGitHubTrendingProduction };
