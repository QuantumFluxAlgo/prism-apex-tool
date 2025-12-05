/**
 * PRISM APEX — Dashboard Vitest setup
 *
 * Vitest + React Testing Library + jest-dom matchers.
 * This file is loaded by Vitest as the test setup entrypoint.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
