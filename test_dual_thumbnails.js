const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

async function testBothProviders() {
  console.log('=== TEST 1: Direct Google Vertex AI (gemini-2.5-flash-image) ===');
  const adcPath = path.join(process.env.HOME || '/Users/sayedjohon', '.config/gcloud/application_default_credentials.json');
  const httpsAgent = new https.Agent({ family: 4, keepAlive: true });
  const httpAgent = new http.Agent({ family: 4, keepAlive: true });

  let vertexOk = false;
  if (fs.existsSync(adcPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token'
      }, { httpsAgent, timeout: 10000 });
      const token = tokenRes.data.access_token;
      console.log('✅ Acquired Vertex OAuth2 Token');

      const url = 'https://us-central1-aiplatform.googleapis.com/v1/projects/newaug626/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent';
      const prompt = 'Create a viral 16:9 YouTube tech thumbnail. In the center, large bold 3D metallic text saying "GITHUB AI". On the left, a heavy brushed steel bank vault door. On the right, a surprised female host with dark wavy hair in commercial studio lighting. 8k resolution.';
      
      const vRes = await axios.post(url, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
      }, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        httpsAgent,
        timeout: 45000
      });

      const parts = vRes.data?.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data) {
          const out = path.join(__dirname, 'temp', 'test_vertex_thumb.png');
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, Buffer.from(p.inlineData.data, 'base64'));
          console.log(`✅ Vertex AI Thumbnail Generated! Size: ${(fs.statSync(out).size / 1024).toFixed(1)} KB -> ${out}`);
          vertexOk = true;
          break;
        }
      }
    } catch (e) {
      console.error('❌ Vertex AI test failed:', e.response?.data || e.message);
    }
  } else {
    console.log('⚠️ ADC not found for Vertex AI');
  }

  console.log('\n=== TEST 2: OmniRoute Antigravity (antigravity/gemini-3.1-flash-image) ===');
  const omniEndpoints = [
    'http://100.86.193.4:20229/v1',
    'https://johonapi.junoverseai.com/v1'
  ];
  const omniKey = 'sk-54c433c8a5b955a8-921a07-1ca6bc8e';
  let omniOk = false;

  for (const endpoint of omniEndpoints) {
    const agent = endpoint.startsWith('https') ? httpsAgent : httpAgent;
    try {
      console.log(`Sending to OmniRoute (${endpoint})...`);
      const oRes = await axios.post(`${endpoint}/images/generations`, {
        model: 'antigravity/gemini-3.1-flash-image',
        prompt: 'A viral 16:9 YouTube tech thumbnail with large 3D architectural text "GITHUB AI", brushed steel industrial vault on the left, studio lighting',
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json'
      }, {
        headers: { 'Authorization': `Bearer ${omniKey}`, 'Content-Type': 'application/json' },
        [endpoint.startsWith('https') ? 'httpsAgent' : 'httpAgent']: agent,
        timeout: 45000
      });

      const data = oRes.data?.data?.[0];
      if (data?.b64_json) {
        const out = path.join(__dirname, 'temp', 'test_omniroute_thumb.png');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(data.b64_json, 'base64'));
        console.log(`✅ OmniRoute Thumbnail Generated! Size: ${(fs.statSync(out).size / 1024).toFixed(1)} KB -> ${out}`);
        omniOk = true;
        break;
      }
    } catch (e) {
      console.error(`❌ OmniRoute (${endpoint}) failed:`, e.response?.data || e.message);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('1. Direct Vertex AI (Nano Banana 2 / gemini-2.5-flash-image):', vertexOk ? '✅ WORKING' : '❌ FAILED');
  console.log('2. OmniRoute Antigravity (antigravity/gemini-3.1-flash-image):', omniOk ? '✅ WORKING' : '❌ FAILED');
}

testBothProviders();
