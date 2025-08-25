import { suggestPercent } from '../src/sizing';

describe('sizing', () => {
  it('suggests half size when buffer not cleared', () => {
    const res = suggestPercent(10, false, 0.5, 1.0);
    expect(res).toEqual({ contracts: 5, halfSizeSuggested: true });
  });

  it('suggests full size when buffer cleared', () => {
    const res = suggestPercent(10, true, 0.5, 1.0);
    expect(res).toEqual({ contracts: 10, halfSizeSuggested: false });
  });
});
