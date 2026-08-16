const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testNative16x9() {
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

  // 1. AI Agent
  const prompt1 = `A viral 16:9 YouTube tech thumbnail in a clean, minimalist high-key white commercial studio setting.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with soft realistic ambient contact shadows and subtle gloss reflections.
RIGHT SIDE: The female creator from the reference character sheet (exact same face, wavy dark brown hair, warm brown eyes) in a large close-up portrait filling the right side from bottom to top edge, showing a shocked, mindblown expression looking toward the center, with bright commercial studio lighting and soft drop shadow behind her onto the white dot-grid wall.
CENTER: Large solid physical matte-black 3D architectural block letters standing firmly upright on the studio floor reading "AI AGENT", casting realistic soft contact shadows and reflections onto the white studio floor.
LEFT SIDE: An oversized industrial brushed-metal robotic claw holding a glowing microchip CPU with realistic mechanical textures and wires, resting firmly on the white studio floor.
STYLE & QUALITY: Tangible real-world physical textures, editorial commercial studio photography, crisp 8k resolution, clean high-key composition, zero dark neon void, zero generic cyberpunk circuits, authentic physical materials.`;

  // 2. Secret Dossier
  const prompt2 = `A viral 16:9 YouTube tech thumbnail in a clean, minimalist high-key white commercial studio setting.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with soft realistic ambient contact shadows and subtle gloss reflections.
RIGHT SIDE: The female creator from the reference character sheet (exact same face, wavy dark brown hair, warm brown eyes) in a large close-up portrait filling the right side from bottom to top edge, making a secret whisper "shhh" gesture with one finger on her lips looking directly at the camera with an intriguing smirk, with bright commercial studio lighting and soft drop shadow behind her onto the white dot-grid wall.
CENTER: Large solid physical matte-black 3D architectural block letters standing firmly upright on the studio floor reading "SECRET REPO", casting realistic soft contact shadows and reflections onto the white studio floor.
LEFT SIDE: An oversized tactile kraft paper classified evidence dossier with a bold red TOP SECRET rubber stamp and a physical heavy brass padlock, casting realistic contact shadows onto the white studio floor.
STYLE & QUALITY: Tangible real-world physical textures, editorial commercial studio photography, crisp 8k resolution, clean high-key composition, zero dark neon void, zero generic cyberpunk circuits, authentic physical materials.`;

  console.log('Generating Native 16:9 AI Agent Thumbnail...');
  const res1 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt1 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '16:9' }
    }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p1 = res1.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p1) {
    const out1 = path.join(__dirname, 'temp', 'native_16x9_agent.png');
    fs.writeFileSync(out1, Buffer.from(p1.inlineData.data, 'base64'));
    console.log(`✅ Saved Native 16:9 AI Agent: ${out1}`);
  }

  console.log('Generating Native 16:9 Secret Dossier Thumbnail...');
  const res2 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt2 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '16:9' }
    }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p2 = res2.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p2) {
    const out2 = path.join(__dirname, 'temp', 'native_16x9_dossier.png');
    fs.writeFileSync(out2, Buffer.from(p2.inlineData.data, 'base64'));
    console.log(`✅ Saved Native 16:9 Secret Dossier: ${out2}`);
  }
}

testNative16x9().catch(console.error);
