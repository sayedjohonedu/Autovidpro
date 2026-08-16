#!/usr/bin/env node
/**
 * Automated Explainer Video Production Engine
 * - Visual: Floating Card GIFs (White Border, Drop Shadow, 36px Rounded Corners)
 * - Background: Looping 4K Pixel/Grid Video or custom video shuffle
 * - Voice: Google Vertex AI Ultra-Realistic Journey Voice ($300 Credit)
 * - Subtitles: Bold Vox/Kurzgesagt-style kinetic captions with yellow highlights
 * - Music: Studio Background Music (BGM) mixing with ducking
 * - Destination: "Phone Farming UAE" YouTube Queue
 */

const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const { AITextService } = require('./utils/ai-text-service');
const { GIFMotionFetcher } = require('./utils/gif-motion-fetcher');
const { FFmpegMotionCanvas } = require('./utils/ffmpeg-motion-canvas');
const { GoogleVertexTTS } = require('./utils/google-vertex-tts');
const { SubtitleRenderer } = require('./utils/subtitle-renderer');
const { AIVideoGenerator } = require('./utils/ai-video-generator');
const { Database } = require('./database/db');

async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(stdout.trim()) || 8.0;
  } catch (err) {
    return 8.0;
  }
}

async function runExplainerProduction() {
  console.log('================================================================');
  console.log('🎬 STARTING BROADCAST-GRADE FLOATING CARD GIF EXPLAINER VIDEO');
  console.log('================================================================\n');

  const textService = new AITextService();
  const gifFetcher = new GIFMotionFetcher();
  const canvasEngine = new FFmpegMotionCanvas({
    bgVideo: '/Users/sayedjohon/Documents/vecteezy_digital-small-squares-animation-black-and-white-pixels-video_31095610.mp4',
    framePng: '/Users/sayedjohon/Documents/Broadcast/final/final_shadow_back.png',
    maskPng: '/Users/sayedjohon/Documents/Broadcast/final/final_mask.png',
    bgm: '/Users/sayedjohon/Documents/Broadcast/final/long bgm.wav'
  });
  const ttsEngine = new GoogleVertexTTS({ voiceName: 'en-US-Journey-F' });
  const subRenderer = new SubtitleRenderer();
  const videoGen = new AIVideoGenerator();
  const db = new Database();
  await db.initialize();

  const outputDir = path.join(__dirname, 'data', 'videos', 'ai_agi_gif_explainer_v2');
  const clipsDir = path.join(outputDir, 'clips');
  const audioDir = path.join(outputDir, 'audio');
  const subsDir = path.join(outputDir, 'subs');

  await fs.mkdir(clipsDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(subsDir, { recursive: true });

  // -------------------------------------------------------------
  // PHASE 1: SCRIPTWRITING WITH GEMINI 3.7 FLASH
  // -------------------------------------------------------------
  console.log('📝 [PHASE 1] Writing Script & Visual Beats with Gemini 3.7 Flash...');
  const systemPrompt = `You are a world-class educational YouTube creator (like Kurzgesagt, Vox, 3Blue1Brown).
Write an engaging, clear, high-retention 1-2 minute explainer video for ALL AGES.
The explanation MUST be crystal clear, using punchy metaphors that anyone can understand instantly.

The topic is: "AI vs AGI vs Superintelligence (ASI): The Levels of Intelligence Explained Simply".

Output strict JSON with this schema:
{
  "title": "Video Title",
  "description": "YouTube description with hashtags",
  "tags": ["AI", "AGI", "Superintelligence", "Future Tech"],
  "thumbnailPrompt": "A vibrant thumbnail concept with glowing AI brain and futuristic universe",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Narrow AI: The Specialized Tool",
      "narration": "Think of today's Artificial Intelligence like a world-class chess champion. It can beat any human at chess, but it cannot make a sandwich or write a poem!",
      "visualBeats": [
        "robot playing chess",
        "making a peanut butter sandwich",
        "writing poem on paper"
      ]
    },
    {
      "sceneNumber": 2,
      "title": "AGI: The Human-Level Mind",
      "narration": "Artificial General Intelligence, or AGI, is different. AGI can learn anything a human can—from painting a masterpiece to diagnosing illnesses and solving math equations.",
      "visualBeats": [
        "robot painting canvas",
        "glowing human brain thinking",
        "eureka lightbulb idea"
      ]
    },
    {
      "sceneNumber": 3,
      "title": "Superintelligence: The Cosmic Leap",
      "narration": "Then comes Superintelligence. An intellect that surpasses the smartest minds on Earth combined, curing diseases and designing the cities of tomorrow in seconds!",
      "visualBeats": [
        "mind blown cosmic galaxy",
        "futuristic glowing green city",
        "space travel rocket warp speed"
      ]
    }
  ]
}`;

  let scriptData;
  try {
    const rawRes = await textService.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the complete 3-scene script in strict JSON format now.' }
    ], { temperature: 0.7 });

    const jsonMatch = rawRes.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from Gemini response');
    scriptData = JSON.parse(jsonMatch[0]);
    console.log(`✅ Script generated: "${scriptData.title}" (${scriptData.scenes.length} scenes)\n`);
  } catch (err) {
    console.warn(`⚠️ Script generator error: ${err.message}. Using high-quality default fallback script.`);
    scriptData = {
      title: "AI vs AGI vs Superintelligence: The Future Explained Simply",
      description: "Ever wondered what the difference between AI, AGI, and Superintelligence is? Here is the ultimate simple guide for all ages! #AI #AGI #FutureTech #Superintelligence",
      tags: ["AI", "AGI", "Superintelligence", "Artificial Intelligence", "Tech Explained"],
      thumbnailPrompt: "A glowing futuristic AI brain transforming into a cosmic supermind, 8k render, vibrant cinematic lighting, YouTube thumbnail",
      scenes: [
        {
          sceneNumber: 1,
          title: "Narrow AI: The Specialist",
          narration: "Think of today's Artificial Intelligence like a world-class chess champion. It can defeat any grandmaster, but it cannot make a sandwich or write a bedtime story!",
          visualBeats: [
            "robot playing chess",
            "making a peanut butter sandwich",
            "writing poem on paper"
          ]
        },
        {
          sceneNumber: 2,
          title: "AGI: The Human-Level All-Rounder",
          narration: "Artificial General Intelligence, or AGI, is completely different. AGI can learn anything a human can—from painting art to diagnosing complex medicine and inventing new tools.",
          visualBeats: [
            "robot painting canvas",
            "glowing human brain",
            "eureka lightbulb idea"
          ]
        },
        {
          sceneNumber: 3,
          title: "Superintelligence: The Cosmic Supermind",
          narration: "And finally, Superintelligence! An intellect millions of times smarter than all human minds combined, solving climate change and unlocking deep cosmic mysteries in seconds.",
          visualBeats: [
            "mind blown galaxy",
            "futuristic green city",
            "cosmic space travel"
          ]
        }
      ]
    };
  }

  await fs.writeFile(path.join(outputDir, 'script.json'), JSON.stringify(scriptData, null, 2), 'utf8');

  // -------------------------------------------------------------
  // PHASE 2 & 3: PRODUCTION & FLOATING CARD COMPOSITING
  // -------------------------------------------------------------
  const renderedScenePaths = [];

  for (const scene of scriptData.scenes) {
    console.log(`\n========================================================`);
    console.log(`🎬 [SCENE ${scene.sceneNumber}] ${scene.title}`);
    console.log(`========================================================`);

    // Synthesize Google Journey Voice
    const voiceAudioPath = path.join(audioDir, `scene_${scene.sceneNumber}.mp3`);
    console.log(`🗣️ Synthesizing Google Vertex Journey Voice...`);
    await ttsEngine.synthesize(scene.narration, voiceAudioPath, 'en-US-Journey-F');
    const sceneDuration = await getAudioDuration(voiceAudioPath);
    console.log(`✅ Journey Voice Duration: ${sceneDuration.toFixed(1)}s`);

    // Render Timed Subtitle Chunk PNGs
    const subtitleChunks = await subRenderer.renderTimedSubtitleChunks(scene.narration, sceneDuration, subsDir, scene.sceneNumber);
    console.log(`✅ Generated ${subtitleChunks.length} timed subtitle chunks`);

    // Process Visual Beats (Strictly within 4 seconds per GIF)
    const maxBeatDuration = 3.6; // Max 3.6s per GIF (well within 4s)
    let beats = scene.visualBeats || [];
    
    // Scene-specific cinematic & movie-reference themes for maximum variety
    const cinematicThemes = {
      1: [
        "robot playing chess checkmate",
        "robot kitchen sandwich fail funny",
        "iron man jarvis holographic ai",
        "terminator vision hud scanner",
        "self driving car autonomous vehicle",
        "robot glitching sparks confusion",
        "supercomputer data processing matrix"
      ],
      2: [
        "robot painting artistic canvas",
        "human brain glowing neural network",
        "einstein chalkboard physics formula",
        "scientist laboratory eureka discovery",
        "doctor analyzing holographic medical scan",
        "iron man building suit workshop",
        "human and android handshake future"
      ],
      3: [
        "galaxy brain cosmic expansion",
        "mind blown universe big bang",
        "futuristic cyberpunk solar city utopia",
        "interstellar wormhole warp speed starship",
        "the matrix green digital rain code",
        "terraforming alien planet clean energy",
        "cosmic glowing supermind constellation"
      ]
    };

    const sceneThemes = cinematicThemes[scene.sceneNumber] || cinematicThemes[1];
    const requiredBeatCount = Math.max(beats.length, Math.ceil(sceneDuration / maxBeatDuration));

    while (beats.length < requiredBeatCount) {
      const nextTheme = sceneThemes[(beats.length) % sceneThemes.length];
      beats.push(nextTheme);
    }

    const actualBeats = beats.slice(0, requiredBeatCount);
    const beatDuration = sceneDuration / actualBeats.length;
    const sceneClipPaths = [];

    console.log(`🎬 Visual Pace: ${actualBeats.length} GIF beats (${beatDuration.toFixed(2)}s per GIF <= 4.0s)`);

    for (let bIdx = 0; bIdx < actualBeats.length; bIdx++) {
      const beatQuery = actualBeats[bIdx];
      console.log(`\n  🎞️ [Beat ${bIdx + 1}/${actualBeats.length}] Searching GIF for: "${beatQuery}" (${beatDuration.toFixed(1)}s)...`);

      const rawGifPath = path.join(clipsDir, `raw_s${scene.sceneNumber}_b${bIdx + 1}.gif`);
      const cardClipPath = path.join(clipsDir, `card_s${scene.sceneNumber}_b${bIdx + 1}.mp4`);

      await gifFetcher.fetchMotionLoop(beatQuery, rawGifPath);
      await canvasEngine.formatToFloatingCard(rawGifPath, beatDuration, cardClipPath);

      sceneClipPaths.push(cardClipPath);
      console.log(`  ✅ Beat ${bIdx + 1} Floating Card Clip Ready`);
    }

    // Stitch Scene Visuals + Voiceover + Random BGM + Transition SFX (20% vol) + Timed Subtitles
    const sceneMasterPath = path.join(outputDir, `scene_${scene.sceneNumber}_complete.mp4`);
    await canvasEngine.stitchSceneClips(sceneClipPaths, voiceAudioPath, sceneMasterPath, {
      subtitleChunks: subtitleChunks,
      beatDurations: Array(sceneClipPaths.length).fill(beatDuration),
      bgmVolume: 0.08
    });

    renderedScenePaths.push(sceneMasterPath);
    console.log(`✅ Scene ${scene.sceneNumber} Master Clip Ready!`);
  }

  // -------------------------------------------------------------
  // PHASE 4: ASSEMBLE MASTER VIDEO
  // -------------------------------------------------------------
  console.log(`\n========================================================`);
  console.log(`🔗 [PHASE 4] Assembling Final Master Video...`);
  console.log(`========================================================`);
  const finalMasterPath = path.join(outputDir, 'ai_agi_explainer_broadcast_1080p.mp4');
  await canvasEngine.assembleMasterVideo(renderedScenePaths, finalMasterPath);

  // -------------------------------------------------------------
  // PHASE 5: 4K THUMBNAIL
  // -------------------------------------------------------------
  console.log(`\n🎨 [PHASE 5] Generating YouTube Thumbnail...`);
  const thumbnailPath = path.join(outputDir, 'thumbnail.png');
  try {
    await videoGen.generateImage(scriptData.thumbnailPrompt, thumbnailPath, { aspectRatio: '16:9' });
    console.log(`✅ Thumbnail Saved: ${thumbnailPath}`);
  } catch (err) {
    console.warn(`⚠️ Thumbnail generation notice: ${err.message}`);
  }

  // -------------------------------------------------------------
  // PHASE 6: REGISTER TO PHONE FARMING UAE QUEUE
  // -------------------------------------------------------------
  console.log(`\n🚀 [PHASE 6] Registering Video to Database Queue for "Phone Farming UAE"...`);
  const videoRecord = {
    id: `explainer_v2_${Date.now()}`,
    topic: scriptData.title,
    title: scriptData.title,
    description: scriptData.description,
    tags: JSON.stringify(scriptData.tags),
    videoPath: finalMasterPath,
    thumbnailPath: thumbnailPath,
    status: 'ready_for_upload',
    privacy: 'unlisted',
    channelName: 'Phone Farming UAE',
    channelId: 'UChJV1G54czn1eweUD-G_Rlw',
    created_at: new Date().toISOString()
  };

  try {
    await db.saveProductionData(videoRecord.id, {
      ...videoRecord,
      script: scriptData,
      scenes: scriptData.scenes
    });
    await db.saveScheduleEntry({
      id: `sched_${videoRecord.id}`,
      video_id: videoRecord.id,
      channel: 'Phone Farming UAE',
      status: 'pending',
      scheduled_time: new Date(Date.now() + 3600000).toISOString()
    });
    console.log('✅ Registered in SQLite Queue for Phone Farming UAE');
  } catch (err) {
    console.warn(`⚠️ DB registration notice: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 BROADCAST-GRADE FLOATING CARD EXPLAINER VIDEO PRODUCTION COMPLETE!');
  console.log(`📁 Master Video: ${finalMasterPath}`);
  console.log(`🖼️ Thumbnail: ${thumbnailPath}`);
  console.log(`📺 Destination: Phone Farming UAE (Ready for One-Click Upload)`);
  console.log('================================================================\n');

  return { finalMasterPath, thumbnailPath, scriptData };
}

if (require.main === module) {
  runExplainerProduction()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Production Error:', err);
      process.exit(1);
    });
}

module.exports = { runExplainerProduction };
