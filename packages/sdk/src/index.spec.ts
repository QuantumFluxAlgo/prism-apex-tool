import { describe, it, expect } from 'vitest';
import { PrismApexClient } from './index.js';

describe('PrismApexClient', () => {
  it('constructs', () => {
    const client = new PrismApexClient('http://localhost');
    expect(client).toBeInstanceOf(PrismApexClient);
  });
});
