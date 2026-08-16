const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testRefinedThumbnail() {
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

  const promptText = `A high-CTR, cinematic 16:9 YouTube tech thumbnail.
Featuring the female creator from the reference character sheet (dark wavy brown hair, expressive warm eyes, same facial features and identity).
She is positioned on the right side in a dramatic medium close-up, looking directly at the camera with an intense, shocked expression (mouth slightly open, hand near face, wide eyes), with professional YouTube studio rim lighting (subtle warm backlight highlighting her hair).
In the background and surrounding scene, a sleek modern tech environment with clean depth of field and soft cinematic bokeh.
Bold, massive, high-contrast 3D headline typography integrated cleanly in the composition reading "TOP GITHUB AI", with vibrant highlights and sharp drop shadow for maximum click-through readability.
On the left, a tactile, premium physical glowing gadget/hardware module representing cutting-edge AI software.
Professional YouTube thumbnail composition, 8k resolution, crisp commercial color grading, sharp focus on face, zero cutout artifacts, seamless scene blending.`;

  console.log('Sending refined thumbnail prompt to Vertex AI Nano Banana 2...');
  const url = 'https://us-central1-aiplatform.googleapis.com/v1/projects/newaug626/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent';

  const response = await axios.post(url, {
    contents: [{
      role: 'user',
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: 'image/png',
            data: refB64
          }
        }
      ]
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT']
    }
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    httpsAgent,
    timeout: 60000
  });

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      const outPath = path.join(__dirname, 'temp', 'refined_thumb_01.png');
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'));
      console.log(`✅ Saved refined thumbnail to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
      return outPath;
    }
  }
}

testRefinedThumbnail().catch(console.error);
