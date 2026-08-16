const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');
const path = require('path');

async function main() {
  console.log('🧪 Testing Multi-Archetype Thumbnail Designer Agent...');
  const designer = new ThumbnailDesignerAgent();

  // Test Case 1: High speed compiler / linter
  console.log('\n--- Test Case 1: Fast Compiler Break ---');
  const concept1 = await designer.designConceptWithAI({
    repo: 'astral-sh/ruff',
    title: 'An extremely fast Python linter and code formatter, written in Rust',
    description: '10-100x faster than existing tools. Instant linting and formatting.',
    readmeSnippet: 'Ruff is an extremely fast Python linter and code formatter. 10-100x faster than existing linters.'
  });
  console.log('Result 1:', JSON.stringify(concept1, null, 2));

  // Test Case 2: Security & Leaks
  console.log('\n--- Test Case 2: Security & OSINT Leak ---');
  const concept2 = await designer.designConceptWithAI({
    repo: 'trufflesecurity/trufflehog',
    title: 'Find leaked credentials and secrets across git repositories and filesystems',
    description: 'Scans repositories for leaked API keys, tokens, passwords and private credentials.',
    readmeSnippet: 'TruffleHog searches through git repositories for high entropy strings and secrets.'
  });
  console.log('Result 2:', JSON.stringify(concept2, null, 2));

  // Test Case 3: Showdown / Versus
  console.log('\n--- Test Case 3: Showdown / Alternative ---');
  const concept3 = await designer.designConceptWithAI({
    repo: 'cline/cline',
    title: 'Autonomous AI coding agent in VSCode vs Claude Engineer CLI',
    description: 'A revolutionary open-source autonomous coding assistant replacing proprietary AI tools.',
    readmeSnippet: 'Cline is an autonomous coding agent that can create/edit files and execute terminal commands.'
  });
  console.log('Result 3:', JSON.stringify(concept3, null, 2));

  // Render 1 live thumbnail to verify pipeline
  console.log('\n🎨 Generating 1 Live Test Thumbnail...');
  const testOutPath = path.join(__dirname, 'temp', 'test_multi_archetype_live.png');
  const result = await designer.generateThumbnail({
    repo: 'cline/cline',
    title: 'Autonomous AI Coding Agent Showdown',
    description: 'Open-source autonomous AI coding assistant with terminal execution.'
  }, testOutPath);

  console.log(`\n🎉 Live Thumbnail Generated Successfully: ${result.path}`);
  console.log(`Archetype Used: ${result.archetypeId}`);
  console.log(`Hook: ${result.concept.hookText}`);
  console.log(`Mood: ${result.concept.mood}`);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
