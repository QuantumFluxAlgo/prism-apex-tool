export function isTestMode(): boolean {
  return process.env.TEST_MODE === '1' || process.env.NODE_ENV === 'test';
}

export function isMockDbEnabled(): boolean {
  return isTestMode() || process.env.MOCK_DB === '1';
}
