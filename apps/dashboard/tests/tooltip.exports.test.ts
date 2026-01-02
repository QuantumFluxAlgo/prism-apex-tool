import * as TooltipMod from '../src/ui/Tooltip';

describe('Tooltip exports', () => {
  it('has named Tooltip export', () => {
    expect(typeof (TooltipMod as any).Tooltip).toBe('function');
  });
  it('has default export (function)', () => {
    expect(typeof (TooltipMod as any).default).toBe('function');
  });
});
