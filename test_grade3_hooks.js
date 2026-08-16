const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');

async function testGrade3Hooks() {
  console.log('🧪 Testing Grade 3 Clean Vocabulary Thumbnail Hooks...');
  const designer = new ThumbnailDesignerAgent();

  const testRepos = [
    {
      repo: 'deepseek-ai/DeepSeek-Coder-V2',
      title: 'Open-Source AI Code Intelligence and Full Repo Reasoning',
      description: 'Massive open code model rivaling GPT-4 and Claude 3.5 Sonnet for free.',
      readmeSnippet: 'DeepSeek-Coder-V2 is an open-source code language model with performance on par with proprietary models.'
    },
    {
      repo: 'shadcn-ui/ui',
      title: 'Beautifully designed components that you can copy and paste into your apps.',
      description: 'Accessible and customizable components that you own. Zero dependencies.',
      readmeSnippet: 'Shadcn UI provides accessible and customizable components that you can copy and paste into your apps.'
    },
    {
      repo: 'sqlfluff/sqlfluff',
      title: 'A modular, dialect-flexible and configurable SQL linter',
      description: 'Linter and auto-formatter for SQL code. Instant error fixes in 1-click.',
      readmeSnippet: 'SQLFluff is a dialect-flexible and configurable SQL linter. Designed with ELT in mind.'
    }
  ];

  for (const repo of testRepos) {
    console.log(`\n========================================`);
    console.log(`Topic: ${repo.repo}`);
    const concept = await designer.designConceptWithAI(repo);
    const cleanHook = designer.sanitizeHookText(concept.hookText, concept.mood);
    console.log(`Auto-Picked Archetype: ${concept.archetypeId}`);
    console.log(`Raw Hook:              "${concept.hookText}"`);
    console.log(`Sanitized Grade 3 Hook: "${cleanHook}"`);
    console.log(`Mood:                  ${concept.mood}`);
    console.log(`Prop:                  ${concept.customProp}`);
  }
}

testGrade3Hooks().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
