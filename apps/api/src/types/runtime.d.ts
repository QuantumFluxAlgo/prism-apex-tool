declare module '@prism-apex-tool/runtime' {
  export function setJobBeat(jobName: string, nowTs?: number): void;
  export function getHealth(nowTs?: number): {
    jobs: Record<string, { lastBeatIso: string; healthy: boolean }>;
    overall: 'healthy' | 'degraded';
  };
  // test-only helper, safe to export
  export function __resetHealth(): void;
}
