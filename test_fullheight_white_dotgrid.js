const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testFullHeightHost() {
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

  const promptText = `A viral 16:9 YouTube tech thumbnail in a clean, minimalist high-key white commercial studio setting.
BACKGROUND & ENVIRONMENT: Pure bright off-white studio background covered with an ultra-fine, delicate technical black micro dot-grid pattern. Clean white studio floor with soft realistic ambient contact shadows and subtle gloss reflections.
RIGHT SIDE: A large, dynamic, close-up portrait of the female creator from the reference character sheet (exact identity, dark wavy brown hair, warm brown eyes) completely filling the right 40% of the frame from top to bottom edge, showing an expressive skeptical sideways glance with an intriguing smirk looking toward the center. Seamlessly integrated with commercial studio lighting and soft drop shadow behind her onto the white dot-grid wall.
CENTER: Large, solid, physical 3D matte-black architectural block letters standing firmly upright on the floor reading "TOP AI", casting realistic soft contact shadows and reflections onto the white studio floor.
LEFT SIDE: A tactile heavy brushed stainless-steel vault door resting on the floor with vibrant glossy bright lime-green chrome liquid slime dripping into a puddle on the ground.
STYLE & QUALITY: Tangible real-world physical textures, editorial commercial studio photography, crisp 8k resolution, clean composition, authentic physical materials.`;

  console.log('Generating Full-Height Host White Dot-Grid Thumbnail...');
  const response = await axios.post(url, {
    contents: [{
      role: 'user',
      parts: [
        { text: promptText },
        { inlineData: { mimeType: 'image/png', data: refB64 } }
      ]
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    httpsAgent,
    timeout: 60000
  });

  const part = response.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (part) {
    const outPath = path.join(__dirname, 'temp', 'white_dotgrid_top_ai_fullheight.png');
    fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'));
    console.log(`✅ Saved full-height thumbnail to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
    return outPath;
  }
}

testFullHeightHost().catch(console.error);
