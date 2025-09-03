import { RequirementParser } from '../src/modules/requirement-parser';
import { AppRequirements } from '../src/types';

describe('RequirementParser tech stack detection', () => {
  const parser = new RequirementParser();

  const cases: Array<{ keyword: string; type: keyof AppRequirements['techStack']; value: AppRequirements['techStack'][keyof AppRequirements['techStack']] }> = [
    // Frontend keywords
    { keyword: 'react', type: 'frontend', value: 'react' },
    { keyword: 'vue', type: 'frontend', value: 'vue' },
    { keyword: 'angular', type: 'frontend', value: 'angular' },
    { keyword: 'svelte', type: 'frontend', value: 'svelte' },
    { keyword: 'next.js', type: 'frontend', value: 'react' },
    { keyword: 'nuxt', type: 'frontend', value: 'vue' },

    // Backend keywords
    { keyword: 'node', type: 'backend', value: 'nodejs' },
    { keyword: 'nodejs', type: 'backend', value: 'nodejs' },
    { keyword: 'express', type: 'backend', value: 'nodejs' },
    { keyword: 'python', type: 'backend', value: 'python' },
    { keyword: 'django', type: 'backend', value: 'python' },
    { keyword: 'flask', type: 'backend', value: 'python' },
    { keyword: 'golang', type: 'backend', value: 'golang' },
    { keyword: 'go', type: 'backend', value: 'golang' },
    { keyword: 'java', type: 'backend', value: 'java' },
    { keyword: 'spring', type: 'backend', value: 'java' },

    // Database keywords
    { keyword: 'postgres', type: 'database', value: 'postgresql' },
    { keyword: 'postgresql', type: 'database', value: 'postgresql' },
    { keyword: 'mongo', type: 'database', value: 'mongodb' },
    { keyword: 'mongodb', type: 'database', value: 'mongodb' },
    { keyword: 'sqlite', type: 'database', value: 'sqlite' },
    { keyword: 'mysql', type: 'database', value: 'mysql' },

    // Deployment keywords
    { keyword: 'docker', type: 'deployment', value: 'docker' },
    { keyword: 'kubernetes', type: 'deployment', value: 'kubernetes' },
    { keyword: 'k8s', type: 'deployment', value: 'kubernetes' },
    { keyword: 'vercel', type: 'deployment', value: 'vercel' },
    { keyword: 'aws', type: 'deployment', value: 'aws' },
  ];

  test.each(cases)("detects '%s' tech stack", async ({ keyword, type, value }) => {
    const result = await parser.parse(`use ${keyword}`);
    expect(result.techStack[type]).toBe(value);
  });
});
