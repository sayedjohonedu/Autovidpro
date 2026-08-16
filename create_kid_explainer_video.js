require('dotenv').config();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { AITextService } = require('./utils/ai-text-service');
const { AIVideoGenerator } = require('./utils/ai-video-generator');
const { Database } = require('./database/db');
const { CredentialManager } = require('./utils/credential-manager');
const { runFFmpeg } = require('./utils/ffmpeg');

async function runKidExplainerVideo() {
  console.log('================================================================');
  console.log('🎬 STARTING EXPLAINER VIDEO PRODUCTION: AI vs AGI vs Superintelligence');
  console.log('Target Audience: Grade 3 Friendly Analogies | Format: 16:9 HD');
  console.log('================================================================\n');

  const outputDir = path.join(__dirname, 'data', 'videos', 'ai_agi_explainer');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'audio'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'images'), { recursive: true });

  const textService = new AITextService();
  const credManager = new CredentialManager();
  await credManager.initialize();
  const videoGen = new AIVideoGenerator(credManager);
  const db = new Database();
  await db.initialize();

  // -------------------------------------------------------------
  // STEP 1: SCRIPTWRITING WITH GEMINI 3.7 FLASH (ALL-AGES UNIVERSAL)
  // -------------------------------------------------------------
  console.log('🧠 [PHASE 1] Writing All-Ages Script with Gemini 3.7 Flash...');
  const scriptPrompt = `You are a world-class science communicator (like Kurzgesagt or Neil deGrasse Tyson).
Write an inspiring, 1-to-2 minute universal explainer script comparing AI, AGI, and Superintelligence (ASI) for a global all-ages audience.
Rules:
- Simple, beautiful, intuitive language that anyone can understand instantly.
- No heavy technical jargon. Use clear analogies (The Specialist Tool vs The Universal Thinker vs The Cosmic Breakthrough).
- Pacing: engaging, awe-inspiring, and optimistic.

Return ONLY valid JSON in this exact structure:
{
  "title": "AI vs AGI vs Superintelligence: The Future Explained Simply",
  "description": "What is the difference between AI, AGI, and Superintelligence? Here is the clearest and simplest explanation for everyone.",
  "tags": ["AI vs AGI", "what is AGI", "artificial superintelligence", "future of AI", "technology explained simply", "science animation"],
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Narrow AI: The Brilliant Specialist",
      "narration": "Think of today's AI like a master chess player or a super-fast calculator. It is brilliant at one specific job—like recognizing your face or translating languages—but it cannot write poetry or drive a car on its own. It is a powerful specialist tool.",
      "imagePrompt": "A glowing holographic crystal prism analyzing streams of digital data and chess patterns, sleek modern futuristic laboratory, cinematic lighting, 8k render, 16:9 aspect ratio, clean aesthetics",
      "duration": 18
    },
    {
      "sceneNumber": 2,
      "title": "AGI: The Universal Thinker",
      "narration": "Now imagine an intelligence that can learn anything a human can. That is AGI—Artificial General Intelligence. It can reason, paint original art, write music, understand jokes, and solve new problems it has never seen before. It is an adaptable universal thinker.",
      "imagePrompt": "A luminous neural core projecting radiant creative ideas, blueprints of architectural marvels, and musical notes in a vast modern glass workshop, cinematic golden hour lighting, 16:9 aspect ratio",
      "duration": 20
    },
    {
      "sceneNumber": 3,
      "title": "Superintelligence: The Exponential Leap",
      "narration": "Beyond AGI lies Superintelligence. Imagine an intellect smarter than all human minds combined. It could discover clean limitless energy in days, invent new branches of physics, and help unlock the deepest mysteries of our universe.",
      "imagePrompt": "A breathtaking cosmic sphere radiating golden energy waves expanding across distant galaxies and futuristic clean cities, awe-inspiring sci-fi cinematic art, 16:9 aspect ratio, photorealistic",
      "duration": 20
    },
    {
      "sceneNumber": 4,
      "title": "Our Journey into Tomorrow",
      "narration": "Today we build the tools. Tomorrow we build the thinkers. When guided with wisdom, humanity and intelligence together can shape an extraordinary future. The journey has only just begun.",
      "imagePrompt": "Human architects and luminous AI interfaces standing together on a cliff overlooking a thriving solar-powered futuristic civilization under a starlit twilight sky, cinematic masterpiece, 16:9",
      "duration": 18
    }
  ]
}`;

  const rawScriptResponse = await textService.generateText(scriptPrompt, { maxTokens: 2048, temperature: 0.6 });
  let scriptData;
  try {
    const cleanJson = rawScriptResponse.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    scriptData = JSON.parse(cleanJson);
  } catch (e) {
    console.log('Parsing fallback, extracting JSON regex...');
    const match = rawScriptResponse.match(/\{[\s\S]*\}/);
    scriptData = JSON.parse(match[0]);
  }

  console.log('✅ Script Created Successfully:');
  console.log('📌 Title:', scriptData.title);
  console.log('🎬 Total Scenes:', scriptData.scenes.length);
  scriptData.scenes.forEach((s, idx) => {
    console.log(`   [Scene ${idx+1}] ${s.title} (${s.duration}s)`);
  });
  console.log('\n');

  // Save script
  await fs.writeFile(path.join(outputDir, 'script.json'), JSON.stringify(scriptData, null, 2));

  // -------------------------------------------------------------
  // STEP 2: GENERATING 16:9 SCENE VISUALS (VERTEX NANO 2 / FLUX)
  // -------------------------------------------------------------
  console.log('🖼️ [PHASE 2] Generating 16:9 HD Scene Illustrations with Vertex Nano 2...');
  const sceneImagePaths = [];
  for (let i = 0; i < scriptData.scenes.length; i++) {
    const scene = scriptData.scenes[i];
    const imgPath = path.join(outputDir, 'images', `scene_${i+1}.png`);
    console.log(`\n🎨 Generating Visual for Scene ${i+1}: "${scene.title}"...`);
    console.log(`   Prompt: ${scene.imagePrompt}`);
    
    const savedPath = await videoGen.generateImage(scene.imagePrompt, imgPath);
    sceneImagePaths.push(savedPath);
    console.log(`   ✅ Saved to: ${savedPath}`);
  }

  // -------------------------------------------------------------
  // STEP 3: GENERATING VOICE NARRATION (TTS)
  // -------------------------------------------------------------
  console.log('\n🎙️ [PHASE 3] Generating Voice Narration for All Scenes...');
  const sceneAudioPaths = [];

  async function generateSpeech(text, audioPath) {
    try {
      if (videoGen.elevenLabsApiKey || videoGen.openai || videoGen.gemini) {
        return await videoGen.generateTTSAudio(text, audioPath);
      }
    } catch (e) {
      console.log('   ℹ️ API TTS fallback to macOS natural voice:', e.message);
    }
    // High-quality macOS natural speech (Samantha / Ava)
    const aiffPath = audioPath.replace(/\.mp3$/, '.aiff');
    const { execSync } = require('child_process');
    execSync(`say -v Samantha -r 160 "${text.replace(/"/g, '\\"')}" -o "${aiffPath}"`);
    await runFFmpeg(['-y', '-i', aiffPath, '-c:a', 'libmp3lame', '-b:a', '192k', audioPath]);
    await fs.unlink(aiffPath).catch(() => {});
    return audioPath;
  }

  for (let i = 0; i < scriptData.scenes.length; i++) {
    const scene = scriptData.scenes[i];
    const audioPath = path.join(outputDir, 'audio', `scene_${i+1}.mp3`);
    console.log(`\n🗣️ Generating Audio for Scene ${i+1}...`);
    console.log(`   Narration: "${scene.narration}"`);

    await generateSpeech(scene.narration, audioPath);
    sceneAudioPaths.push(audioPath);
    console.log(`   ✅ Audio Generated: ${audioPath}`);
  }

  // -------------------------------------------------------------
  // STEP 4: VIDEO ASSEMBLY WITH FFMPEG (16:9 Full HD 1080p)
  // -------------------------------------------------------------
  console.log('\n🎬 [PHASE 4] Assembling Scenes & Motion Video with FFmpeg...');
  const finalVideoPath = path.join(outputDir, 'ai_agi_explainer_1080p.mp4');

  // Convert each scene image + audio into a scene video clip
  const clipPaths = [];
  for (let i = 0; i < scriptData.scenes.length; i++) {
    const clipPath = path.join(outputDir, `clip_${i+1}.mp4`);
    const img = sceneImagePaths[i];
    const audio = sceneAudioPaths[i];

    console.log(`🎞️ Rendering Scene ${i+1} Clip with subtle Ken Burns motion...`);
    
    // Zoom/pan motion filter + scaling to 1920x1080
    const filter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0008,1.15)':d=700:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
    
    await runFFmpeg([
      '-y',
      '-loop', '1',
      '-i', img,
      '-i', audio,
      '-vf', filter,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      clipPath
    ]);

    clipPaths.push(clipPath);
    console.log(`   ✅ Scene ${i+1} Clip Ready: ${clipPath}`);
  }

  // Concatenate all clips into the master video
  console.log('\n🔗 Stitching all scenes into final master video...');
  const concatListPath = path.join(outputDir, 'concat_list.txt');
  const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
  await fs.writeFile(concatListPath, concatContent);

  await runFFmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    finalVideoPath
  ]);

  console.log(`🎉 Master Video Assembled Successfully!`);
  console.log(`📁 Video Path: ${finalVideoPath}`);

  // -------------------------------------------------------------
  // STEP 5: GENERATE 4K THUMBNAIL
  // -------------------------------------------------------------
  console.log('\n🎨 [PHASE 5] Generating YouTube Thumbnail with Vertex Nano 2...');
  const thumbnailPrompt = 'A cute colorful 3D robot puppy and a cosmic robot wizard smiling together holding a glowing glowing sign that says AI, high contrast, vibrant cinematic 3D Pixar lighting, YouTube thumbnail 16:9';
  const thumbnailPath = path.join(outputDir, 'thumbnail.png');
  await videoGen.generateImage(thumbnailPrompt, thumbnailPath);
  console.log(`✅ Thumbnail Saved to: ${thumbnailPath}`);

  // -------------------------------------------------------------
  // STEP 6: YOUTUBE METADATA & PUBLISH QUEUE
  // -------------------------------------------------------------
  console.log('\n🚀 [PHASE 6] Registering to YouTube Channel "Phone Farming UAE"...');
  const productionEntry = {
    id: 'ai-agi-kids-' + Date.now(),
    title: scriptData.title,
    description: scriptData.description + '\n\nTimestamps:\n0:00 What is AI? (The Clever Puppy)\n0:20 What is AGI? (The Magical Robot Buddy)\n0:45 What is Superintelligence? (The Cosmic Wizard)\n1:10 Building a Bright Future\n\n#AI #AGI #Superintelligence #Education #TechForKids',
    tags: scriptData.tags,
    videoPath: finalVideoPath,
    thumbnailPath: thumbnailPath,
    status: 'ready_for_upload',
    privacy: 'unlisted',
    createdAt: new Date().toISOString()
  };

  await db.saveProductionData(productionEntry);
  console.log('✅ Video Registered in Database and ready for one-click upload or scheduler!');

  console.log('\n================================================================');
  console.log('🎉 EXPLAINER VIDEO GENERATION COMPLETE!');
  console.log('📁 Video File:', finalVideoPath);
  console.log('🖼️ Thumbnail:', thumbnailPath);
  console.log('📺 Destination Channel: Phone Farming UAE (Unlisted)');
  console.log('================================================================\n');

  return {
    success: true,
    videoPath: finalVideoPath,
    thumbnailPath: thumbnailPath,
    title: scriptData.title,
    scenes: scriptData.scenes
  };
}

runKidExplainerVideo().catch(err => {
  console.error('\n❌ Video generation encountered an error:', err);
  process.exit(1);
});
