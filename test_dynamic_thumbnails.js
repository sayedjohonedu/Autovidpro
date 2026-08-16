const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testDynamicTopicThumbnails() {
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

  // TEST CASE 1: Video topic is "Automated Coding Agent / Deep Research Bot"
  // The left prop should be a large, tactile robotic mechanical hand breaking through an Apple glass terminal or physical server blade.
  const prompt1 = `A professional 16:9 YouTube thumbnail in a clean, minimalist high-key commercial studio aesthetic.
COMPOSITION & FRAMING (16:9):
- RIGHT SIDE: The woman from the reference character sheet is generated freshly as a large, dominant host in a medium-close up portrait filling the entire right 45% of the 16:9 screen from bottom to top. She has the same face identity, wavy dark brown hair, looking at the camera with an intense shocked, mindblown expression (one hand on forehead, wide eyes). She is a full, seamless part of the scene with high-key commercial studio lighting and soft shadows.
- LEFT SIDE: A large, prominent, dynamic physical subject representing an automated AI coding bot: a heavy industrial brushed-metal robotic claw holding a glowing microchip CPU with intricate realistic wires and metallic textures, sitting prominently on the studio floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural block letters with deep contact shadows reading "AI AGENT".
- BACKGROUND: High-key clean off-white studio background with a delicate technical black micro dot-grid pattern and realistic studio floor shadows.
- STYLE: Ultra-crisp commercial product photography, 8k resolution, perfectly balanced Rule of Thirds thumbnail composition, tangible physical materials, zero cutout borders, zero generic sci-fi glow.`;

  // TEST CASE 2: Video topic is "Database Leak / Security Tool"
  // The left prop is a classified physical paper dossier folder with red wax seal and steel lock.
  const prompt2 = `A professional 16:9 YouTube thumbnail in a clean, minimalist high-key commercial studio aesthetic.
COMPOSITION & FRAMING (16:9):
- RIGHT SIDE: The woman from the reference character sheet generated freshly as a large, dominant host in a medium portrait filling the entire right 45% of the 16:9 frame from bottom to top. Same facial identity, wavy dark brown hair, making an expressive secret whisper "shhh" gesture with one finger on her lips, looking directly into the camera with an intriguing smirk. High-key studio lighting with soft contact shadow.
- LEFT SIDE: A large, prominent physical subject representing classified code: an oversized tactile kraft paper classified evidence dossier with a bold red rubber stamp and a physical heavy brass padlock, casting a deep realistic shadow onto the studio floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural typography reading "SECRET REPO", casting crisp contact drop shadows on the ground.
- BACKGROUND: Clean off-white studio floor with a delicate technical black micro dot-grid pattern.
- STYLE: Professional YouTube thumbnail composition, 8k resolution, crisp commercial lighting, tangible real-world physical textures, zero cutout borders.`;

  console.log('Generating Dynamic Thumbnail 1 (AI Coding Agent)...');
  const res1 = await axios.post(url, {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt1 },
        { inlineData: { mimeType: 'image/png', data: refB64 } }
      ]
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p1 = res1.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p1) {
    const out1 = path.join(__dirname, 'temp', 'dynamic_thumb_agent.png');
    fs.writeFileSync(out1, Buffer.from(p1.inlineData.data, 'base64'));
    console.log(`✅ Saved Thumbnail 1: ${out1}`);
  }

  console.log('Generating Dynamic Thumbnail 2 (Secret Dossier)...');
  const res2 = await axios.post(url, {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt2 },
        { inlineData: { mimeType: 'image/png', data: refB64 } }
      ]
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p2 = res2.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p2) {
    const out2 = path.join(__dirname, 'temp', 'dynamic_thumb_dossier.png');
    fs.writeFileSync(out2, Buffer.from(p2.inlineData.data, 'base64'));
    console.log(`✅ Saved Thumbnail 2: ${out2}`);
  }
}

testDynamicTopicThumbnails().catch(console.error);
