export type ReplayMode = 'bar' | 'tick';

export const Flags = {
  replayMode: (process.env.REPLAY_MODE as ReplayMode) || 'bar',
  // Future: latencyMs, queueModel, partialFills enabled
};
