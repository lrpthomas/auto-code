import { RequirementParser } from '../src/modules/requirement-parser';

describe('RequirementParser analyze', () => {
  let parser: RequirementParser;

  beforeEach(() => {
    parser = new RequirementParser();
  });

  it('returns positive sentiment for positive input', async () => {
    const result = await parser.analyze('I love this application');
    expect(result.sentiment).toBeGreaterThan(0);
  });

  it('returns negative sentiment for negative input', async () => {
    const result = await parser.analyze('I hate this application');
    expect(result.sentiment).toBeLessThan(0);
  });
});
