const path = require('path');
const { ThumbnailStudioGenerator } = require('./utils/thumbnail-studio-generator');

async function testThumbnail() {
  console.log('Testing ThumbnailStudioGenerator...');
  const gen = new ThumbnailStudioGenerator();
  const outputPath = path.join(__dirname, 'temp', 'test_thumb_output.png');
  
  try {
    const result = await gen.generateThumbnail({
      hookText: 'TOP GITHUB AI',
      mood: 'shocked',
      framing: 'chest_up',
      stylePresetId: 'industrial_vault',
      outputPath: outputPath
    });
    console.log('Success:', result);
  } catch (err) {
    console.error('Error generating thumbnail:', err.response?.data || err.message || err);
  }
}

testThumbnail();
