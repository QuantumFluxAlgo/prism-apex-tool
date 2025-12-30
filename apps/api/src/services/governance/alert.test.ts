import { describe, expect, test, vi } from 'vitest';
import { logGovernanceAlert } from './alert.js';

vi.mock('../../observability/logger.js', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { logger } from '../../observability/logger.js';

describe('logGovernanceAlert', () => {
  test('emits structured payload for safety drops', () => {
    logGovernanceAlert('safety_drops', {
      strategy: 'orr',
      symbol: 'ES',
      sessionDate: '2025-01-15',
      dropCount: 2,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'governance_alert',
        event: 'safety_drops',
        strategy: 'orr',
        dropCount: 2,
      }),
    );
  });
});
