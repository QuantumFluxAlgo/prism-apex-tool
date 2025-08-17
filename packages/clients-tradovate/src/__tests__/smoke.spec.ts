import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { placeholder } from '../index.js';

describe('clients-tradovate package', () => {
  it('returns identifier', () => {
    expect(placeholder()).toBe('clients-tradovate');
  });
});
