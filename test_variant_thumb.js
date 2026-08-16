const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function generateMoreVariants() {
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

  const promptSecret = `A viral, high-CTR 16:9 YouTube thumbnail.
Featuring the female creator from the reference character sheet (same identity, dark wavy brown hair, warm brown eyes).
She is positioned in the right half of the frame making a secret "shhh" whisper gesture with her index finger on her lips, looking directly into the camera with an intriguing smirk and wide curious eyes.
Cinematic YouTube studio background with high-end dark ambient studio lighting, soft golden rim light outlining her hair and shoulders.
Large, ultra-bold, 3D high-contrast yellow and white headline text in the center/upper-left reading "SECRET AI TOOL", casting deep physical drop shadow.
On the left, a sleek, tactile physical metallic device with clean glowing indicators.
Masterful YouTube composition, 8k resolution, razor-sharp focus on face, zero cutout borders, seamless professional composite.`;

  console.log('Generating variant 2 (Secret Shhh)...');
  const res2 = await axios.post(url, {
    contents: [{
      role: 'user',
      parts: [
        { text: promptSecret },
        { inlineData: { mimeType: 'image/png', data: refB64 } }
      ]
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  }, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    httpsAgent,
    timeout: 60000
  });

  const p2 = res2.data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (p2) {
    const out2 = path.join(__dirname, 'temp', 'refined_thumb_02_secret.png');
    fs.writeFileSync(out2, Buffer.from(p2.inlineData.data, 'base64'));
    console.log(`✅ Saved variant 2 to ${out2}`);
  }
}

generateMoreVariants().catch(console.error);
