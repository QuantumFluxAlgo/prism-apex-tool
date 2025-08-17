import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { placeholder } from '../index.js';

describe('rules-apex package', () => {
  it('returns identifier', () => {
    expect(placeholder()).toBe('rules-apex');
  });
});
