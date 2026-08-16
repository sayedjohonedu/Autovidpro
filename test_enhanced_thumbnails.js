const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testEnhancedThumbnails() {
  const adcPath = path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
  const httpsAgent = new https.Agent({ family: 4, keepAlive: true });
  const creds = JSON.parse(fs.readFileSync(adcPath, 'utf8'));

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token'
  }, { httpsAgent, timeout: 10000 });
  const token = tokenRes.data.access_token;

  const characterRefPath = path.join(__dirname, 'Assets', 'Character Reference.png');
  const refB64 = fs.readFileSync(characterRefPath).toString('base64');
  const url = 'https://us-central1-aiplatform.googleapis.com/v1/projects/newaug626/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent';

  // 1. AI Coding Agent / Autonomous Bot
  const prompt1 = `A viral 16:9 wide YouTube thumbnail in a clean high-key commercial tech studio.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with realistic glossy reflections and ambient contact shadows.
RIGHT SIDE (DOMINANT CLOSE-UP): A large, tight, dominant close-up portrait of the female creator from the reference character sheet (exact same face, dark wavy brown hair, warm brown eyes) completely covering the right 45% of the 16:9 frame from the top down to the bottom edge. She is showing a shocked, mindblown expression with one hand on her forehead and wide focused eyes, lit with commercial high-key studio rim lighting and a soft drop shadow behind her onto the white dot-grid wall.
LEFT SIDE: An oversized tactile industrial brushed-metal robotic claw holding a glowing microchip CPU with detailed copper heat pipes and wiring, resting firmly on the white glossy floor.
COMPOSITION & MOTION ELEMENTS: Floating subtle holographic translucent data nodes and miniature glass terminal glyphs drifting in soft cinematic motion blur and shallow depth-of-field around the scene to create speed and dynamic energy while keeping the main focal points crystal clear.
CENTER: Large solid physical matte-black 3D architectural block letters standing firmly upright on the studio floor reading "AI AGENT", casting realistic soft contact shadows and reflections onto the white studio floor.
STYLE: Ultra-crisp commercial product photography, 8k resolution, perfectly balanced Rule of Thirds composition, tangible physical materials, zero cutout borders, zero generic neon void.`;

  // 2. Open-Source AI Model / Deep Learning Compiler
  const prompt2 = `A viral 16:9 wide YouTube thumbnail in a clean high-key commercial tech studio.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with glossy reflections and soft contact shadows.
RIGHT SIDE (DOMINANT CLOSE-UP): A large, tight, dominant close-up portrait of the female creator from the reference character sheet (exact same face, dark wavy brown hair, warm brown eyes) completely covering the right 45% of the frame from the top to the bottom edge. She is making an expressive secret whisper "shhh" gesture with one finger on her lips looking directly at the camera with an intriguing smirk.
LEFT SIDE: A heavy industrial brushed stainless-steel server cube module with visible mechanical hex bolts, cooling fins, and subtle green indicator lights, resting firmly on the studio floor.
COMPOSITION & MOTION ELEMENTS: Subtle floating translucent code snippet tabs and glass circuit data tokens drifting in soft directional motion blur in the mid-ground, adding dynamic tech velocity while maintaining pristine composition balance.
CENTER: Large solid physical matte-black 3D architectural block letters standing firmly upright on the studio floor reading "OPEN MODEL", casting realistic soft contact shadows and reflections onto the white studio floor.
STYLE: High-end editorial studio photography, 8k resolution, crisp commercial lighting, authentic physical textures, perfectly balanced wide 16:9 layout.`;

  console.log('Generating Enhanced Thumbnail 1 (AI AGENT)...');
  const res1 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt1 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '16:9' }
    }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p1 = res1.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p1) {
    const out1 = path.join(__dirname, 'temp', 'enhanced_thumb_agent.png');
    fs.writeFileSync(out1, Buffer.from(p1.inlineData.data, 'base64'));
    console.log(`✅ Saved Enhanced Thumbnail 1: ${out1}`);
  }

  console.log('Generating Enhanced Thumbnail 2 (OPEN MODEL)...');
  const res2 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt2 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '16:9' }
    }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p2 = res2.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p2) {
    const out2 = path.join(__dirname, 'temp', 'enhanced_thumb_model.png');
    fs.writeFileSync(out2, Buffer.from(p2.inlineData.data, 'base64'));
    console.log(`✅ Saved Enhanced Thumbnail 2: ${out2}`);
  }
}

testEnhancedThumbnails().catch(console.error);
