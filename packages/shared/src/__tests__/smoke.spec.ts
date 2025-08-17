import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { hello } from '../index.js';

describe('shared package', () => {
  it('says hello', () => {
    expect(hello('world')).toBe('Hello, world!');
  });
});
