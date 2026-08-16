const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('sharp');

async function generateWithGemini31FlashImage() {
  const httpAgent = new http.Agent({ family: 4, keepAlive: true });
  const baseURL = 'http://100.86.193.4:20229/v1';
  const apiKey = 'sk-54c433c8a5b955a8-921a07-1ca6bc8e';
  const model = 'antigravity/gemini-3.1-flash-image';

  console.log(`=== Generating YouTube Thumbnails via Gemini 3.1 Flash Image (${model}) ===`);

  // Prompt 1: AI Agent
  const prompt1 = `A professional 16:9 wide YouTube thumbnail in a clean high-key commercial studio setting.
COMPOSITION & 16:9 FRAMING:
- RIGHT SIDE (FULL-HEIGHT FLUSH): A large, prominent, dominant portrait of an expressive female creator (dark wavy brown hair, warm brown eyes) completely filling the right half (45-50%) of the 16:9 frame from the very top edge all the way down to the bottom border. Her head, hair, and shoulders fill the entire vertical height of the right side with no white gaps above or below her. She is looking directly at the camera with an intense, shocked mindblown expression (one hand on forehead, wide eyes), with bright commercial studio lighting and soft drop shadow behind her onto the white dot-grid wall.
- LEFT SIDE: A large, prominent, dynamic physical subject sitting firmly on the studio floor: an industrial brushed-metal robotic claw holding a glowing microchip CPU with intricate realistic wires and metallic textures, casting realistic ambient contact shadows onto the white floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural block letters with deep contact shadows reading "AI AGENT".
- BACKGROUND: High-key clean off-white studio background with a delicate technical black micro dot-grid pattern and realistic studio floor reflections.
- STYLE: Ultra-crisp commercial product photography, 8k resolution, perfectly balanced Rule of Thirds wide 16:9 composition, tangible physical materials, zero cutout borders, zero generic sci-fi glow.`;

  // Prompt 2: Secret Repo Dossier
  const prompt2 = `A professional 16:9 wide YouTube thumbnail in a clean high-key commercial studio setting.
COMPOSITION & 16:9 FRAMING:
- RIGHT SIDE (FULL-HEIGHT FLUSH): A large, prominent, dominant portrait of an expressive female creator (dark wavy brown hair, warm brown eyes) completely filling the right half (45-50%) of the 16:9 frame from the top edge all the way down to the bottom border. Her head and torso occupy the full vertical height on the right with zero empty white margins above her head or below her chest. She is making an expressive secret whisper "shhh" gesture with one finger on her lips, looking directly into the camera with an intriguing smirk. High-key studio lighting with soft contact shadow.
- LEFT SIDE: A large, prominent physical subject: an oversized tactile kraft paper classified evidence dossier with a bold red rubber stamp and a physical heavy brass padlock, casting a deep realistic shadow onto the studio floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural typography reading "SECRET REPO", casting crisp contact drop shadows on the ground.
- BACKGROUND: Clean off-white studio floor with a delicate technical black micro dot-grid pattern.
- STYLE: Professional YouTube thumbnail composition, 8k resolution, crisp commercial lighting, tangible real-world physical textures, zero cutout borders.`;

  console.log('1. Generating AI Agent thumbnail via Gemini 3.1 Flash Image...');
  const res1 = await axios.post(`${baseURL}/images/generations`, {
    model: model,
    prompt: prompt1,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json'
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    httpAgent,
    timeout: 60000
  });

  const b64_1 = res1.data?.data?.[0]?.b64_json;
  if (b64_1) {
    const rawBuf = Buffer.from(b64_1, 'base64');
    const out1 = path.join(__dirname, 'temp', 'gemini31_agent_thumb.png');
    await sharp(rawBuf)
      .resize(1920, 1080, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(out1);
    console.log(`✅ Saved True 16:9 (1920x1080) AI Agent Thumbnail: ${out1}`);
  }

  console.log('2. Generating Secret Dossier thumbnail via Gemini 3.1 Flash Image...');
  const res2 = await axios.post(`${baseURL}/images/generations`, {
    model: model,
    prompt: prompt2,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json'
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    httpAgent,
    timeout: 60000
  });

  const b64_2 = res2.data?.data?.[0]?.b64_json;
  if (b64_2) {
    const rawBuf2 = Buffer.from(b64_2, 'base64');
    const out2 = path.join(__dirname, 'temp', 'gemini31_dossier_thumb.png');
    await sharp(rawBuf2)
      .resize(1920, 1080, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(out2);
    console.log(`✅ Saved True 16:9 (1920x1080) Secret Dossier Thumbnail: ${out2}`);
  }
}

generateWithGemini31FlashImage().catch(console.error);
