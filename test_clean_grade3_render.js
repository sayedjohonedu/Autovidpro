const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');
const path = require('path');

async function testRender() {
  const designer = new ThumbnailDesignerAgent();
  const testOutPath = path.join(__dirname, 'temp', 'test_grade3_clean_thumb.png');
  
  console.log('🎨 Generating Live Thumbnail with Grade 3 hook (Zero AI buzzwords)...');
  const result = await designer.generateThumbnail({
    repo: 'deepseek-ai/DeepSeek-Coder-V2',
    title: 'Open-Source AI Code Intelligence and Full Repo Reasoning',
    description: 'Free open source AI model that beats GPT-4 with zero monthly fees.',
    readmeSnippet: 'DeepSeek-Coder-V2 beats proprietary models and is completely free to run.'
  }, testOutPath);

  console.log(`✅ Saved Grade 3 Thumbnail: ${result.path}`);
  console.log(`Archetype: ${result.archetypeId}`);
  console.log(`Clean Hook: ${result.concept.hookText}`);
  console.log(`Mood: ${result.concept.mood}`);
}

testRender().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
