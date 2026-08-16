require('dotenv').config();
const { AITextService } = require('./utils/ai-text-service');
const { AIVideoGenerator } = require('./utils/ai-video-generator');
const path = require('path');

async function testLiveOmniRoute() {
  console.log('--- 1. Testing OmniRoute Text Generation (Gemini 3.6 Flash) ---');
  const textService = new AITextService();
  const scriptPrompt = 'Write a 2-sentence captivating hook about Quantum Computing breakthroughs.';
  console.log('Prompt:', scriptPrompt);
  const textResponse = await textService.generateText(scriptPrompt);
  console.log('Result:\n', textResponse);

  console.log('\n--- 2. Testing OmniRoute Image Generation (Gemini 3.1 Flash Image) ---');
  const videoGen = new AIVideoGenerator({});
  const testImagePath = path.join(__dirname, 'data', 'assets', 'live_test_gemini.png');
  const imagePrompt = 'A futuristic quantum computer floating in deep space glowing with neon cyan and gold energy, 16:9 wallpaper, cinematic lighting';
  console.log('Generating image with prompt:', imagePrompt);
  const generatedPath = await videoGen.generateImage(imagePrompt, testImagePath);
  console.log('✅ Image saved to:', generatedPath);
}

testLiveOmniRoute()
  .then(() => console.log('\n🎉 Live OmniRoute verification succeeded!'))
  .catch(err => console.error('\n❌ Live test failed:', err));
