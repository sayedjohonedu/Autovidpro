const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testGemini31() {
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

  // Test with gemini-3.1-flash-image
  console.log('Testing gemini-3.1-flash-image on Vertex AI...');
  const modelsToTest = [
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'imagegeneration@006'
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Trying model: ${model}...`);
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/newaug626/locations/us-central1/publishers/google/models/${model}:generateContent`;
      const res = await axios.post(url, {
        contents: [{
          role: 'user',
          parts: [
            { text: 'A viral 16:9 YouTube tech thumbnail. Clean white studio background with subtle black micro dot-grid.' },
            { inlineData: { mimeType: 'image/png', data: refB64 } }
          ]
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: '16:9'
          }
        }
      }, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        httpsAgent,
        timeout: 45000
      });

      const p = res.data?.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data);
      if (p) {
        console.log(`✅ SUCCESS with model ${model}! Image size: ${p.inlineData.data.length} chars`);
        break;
      } else {
        console.log(`Response received for ${model} but no image part:`, JSON.stringify(res.data).substring(0, 200));
      }
    } catch (err) {
      console.log(`❌ Model ${model} failed: ${err.response?.status} - ${err.response?.data?.error?.message || err.message}`);
    }
  }
}

testGemini31().catch(console.error);
