const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function testAspectRatios() {
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

  const configsToTest = [
    { name: 'imageConfig_aspectRatio', config: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: '16:9' } } },
    { name: 'aspectRatio_direct', config: { responseModalities: ['IMAGE', 'TEXT'], aspectRatio: '16:9' } },
    { name: 'imageOptions', config: { responseModalities: ['IMAGE', 'TEXT'], imageOptions: { aspectRatio: '16:9' } } }
  ];

  for (const item of configsToTest) {
    try {
      console.log(`Testing config: ${item.name}...`);
      const res = await axios.post(url, {
        contents: [{
          role: 'user',
          parts: [
            { text: 'A clean 16:9 wide YouTube thumbnail in high-key studio with micro dot grid.' },
            { inlineData: { mimeType: 'image/png', data: refB64 } }
          ]
        }],
        generationConfig: item.config
      }, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        httpsAgent,
        timeout: 45000
      });

      const p = res.data?.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data);
      if (p) {
        const buf = Buffer.from(p.inlineData.data, 'base64');
        const sipsOut = path.join(__dirname, 'temp', `test_${item.name}.png`);
        fs.writeFileSync(sipsOut, buf);
        console.log(`✅ Success for ${item.name}! File written: ${sipsOut}`);
      }
    } catch (e) {
      console.log(`❌ Failed ${item.name}: ${e.response?.status} - ${e.response?.data?.error?.message || e.message}`);
    }
  }
}

testAspectRatios().catch(console.error);
