const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

async function testTrue16x9Thumbnails() {
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

  // TEST 1: AI Agent (Fixed Full-Screen Right Host + True 16:9)
  const prompt1 = `A professional 16:9 wide YouTube thumbnail in a clean high-key commercial studio setting.
COMPOSITION & 16:9 FRAMING:
- RIGHT SIDE (FULL-HEIGHT FLUSH): A large, prominent, dominant portrait of the female creator from the reference character sheet (exact same facial features, wavy dark brown hair, warm brown eyes) completely filling the right half (45-50%) of the 16:9 frame from the very top edge all the way down to the bottom border. Her head, hair, and shoulders fill the entire vertical height of the right side with no white gaps above or below her. She is looking directly at the camera with an intense, shocked mindblown expression (one hand on forehead, wide eyes), with bright commercial studio lighting and soft drop shadow behind her onto the white dot-grid wall.
- LEFT SIDE: A large, prominent, dynamic physical subject sitting firmly on the studio floor: an industrial brushed-metal robotic claw holding a glowing microchip CPU with intricate realistic wires and metallic textures, casting realistic ambient contact shadows onto the white floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural block letters with deep contact shadows reading "AI AGENT".
- BACKGROUND: High-key clean off-white studio background with a delicate technical black micro dot-grid pattern and realistic studio floor reflections.
- STYLE: Ultra-crisp commercial product photography, 8k resolution, perfectly balanced Rule of Thirds wide 16:9 composition, tangible physical materials, zero cutout borders, zero generic sci-fi glow.`;

  // TEST 2: Secret Dossier (Fixed Full-Screen Right Host + True 16:9)
  const prompt2 = `A professional 16:9 wide YouTube thumbnail in a clean high-key commercial studio setting.
COMPOSITION & 16:9 FRAMING:
- RIGHT SIDE (FULL-HEIGHT FLUSH): A large, prominent, dominant portrait of the female creator from the reference character sheet (exact same face, wavy dark brown hair, warm brown eyes) completely filling the right half (45-50%) of the 16:9 frame from the top edge all the way down to the bottom border. Her head and torso occupy the full vertical height on the right with zero empty white margins above her head or below her chest. She is making an expressive secret whisper "shhh" gesture with one finger on her lips, looking directly into the camera with an intriguing smirk. High-key studio lighting with soft contact shadow.
- LEFT SIDE: A large, prominent physical subject: an oversized tactile kraft paper classified evidence dossier with a bold red rubber stamp and a physical heavy brass padlock, casting a deep realistic shadow onto the studio floor.
- CENTER / UPPER-MIDDLE: Large, bold, solid 3D matte-black architectural typography reading "SECRET REPO", casting crisp contact drop shadows on the ground.
- BACKGROUND: Clean off-white studio floor with a delicate technical black micro dot-grid pattern.
- STYLE: Professional YouTube thumbnail composition, 8k resolution, crisp commercial lighting, tangible real-world physical textures, zero cutout borders.`;

  console.log('Generating Thumbnail 1 (AI Agent - True 16:9)...');
  const res1 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt1 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p1 = res1.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p1) {
    const rawBuffer = Buffer.from(p1.inlineData.data, 'base64');
    const out1 = path.join(__dirname, 'temp', 'dynamic_thumb_agent.png');
    // Ensure true 16:9 1920x1080 resolution with Sharp
    await sharp(rawBuffer)
      .resize(1920, 1080, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(out1);
    console.log(`✅ Saved True 16:9 Thumbnail 1: ${out1}`);
  }

  console.log('Generating Thumbnail 2 (Secret Dossier - True 16:9)...');
  const res2 = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt2 }, { inlineData: { mimeType: 'image/png', data: refB64 } }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent, timeout: 60000 });

  const p2 = res2.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p2) {
    const rawBuffer2 = Buffer.from(p2.inlineData.data, 'base64');
    const out2 = path.join(__dirname, 'temp', 'dynamic_thumb_dossier.png');
    // Ensure true 16:9 1920x1080 resolution with Sharp
    await sharp(rawBuffer2)
      .resize(1920, 1080, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(out2);
    console.log(`✅ Saved True 16:9 Thumbnail 2: ${out2}`);
  }
}

testTrue16x9Thumbnails().catch(console.error);
