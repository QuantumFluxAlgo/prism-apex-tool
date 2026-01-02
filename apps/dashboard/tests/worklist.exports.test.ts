import * as WorklistMod from '../src/pages/Worklist';

describe('Worklist exports', () => {
  it('exports default Worklist', () => {
    expect(WorklistMod).toHaveProperty('default');
    expect(typeof (WorklistMod as any).default).toBe('function');
  });
});
