import { describe, it, expect } from 'vitest';
import { TestGenerator } from '../src/modules/test-generator';

describe('renderTemplate', () => {
  it('resolves nested placeholders', async () => {
    const generator = new TestGenerator();
    await generator.initialize();
    const content = (generator as any).renderTemplate('react-component', {
      componentName: 'SampleComponent',
      componentPath: 'components/SampleComponent',
      testCases: []
    });
    expect(content).toContain('samplecomponent');
  });
});
