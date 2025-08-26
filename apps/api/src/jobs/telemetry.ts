import { createTelemetryClient, TelemetrySnapshot } from '@prism-apex-tool/clients-tradovate/telemetry';
import { publish } from '../lib/bus.js';
import { applySnapshot } from '../store/telemetry.js';

export const telemetry = {
  running: false,
  lastSnapshotTs: '',
  accounts: 0,
  positions: 0,
  fillsToday: 0,
  bufferCleared: false,
};

let stopper: (() => void) | null = null;

function onSnapshot(s: TelemetrySnapshot) {
  telemetry.lastSnapshotTs = new Date().toISOString();
  telemetry.accounts = s.accounts.length;
  telemetry.positions = s.positions.length;
  telemetry.fillsToday = s.fills.length;
  telemetry.bufferCleared = s.bufferCleared;
  applySnapshot(s);
  publish('telemetry.snapshot', s);
}

export function startTelemetryJob() {
  if (process.env.ENABLE_TELEMETRY !== 'true') return;
  const env = {
    restBase: process.env.TRADOVATE_DEMO_REST_BASE || '',
    appId: process.env.TRADOVATE_APP_ID || '',
    appVersion: process.env.TRADOVATE_APP_VERSION || '',
    user: process.env.TRADOVATE_USER || '',
    password: process.env.TRADOVATE_PASSWORD || '',
    cid: process.env.TRADOVATE_API_CID || '',
    sec: process.env.TRADOVATE_API_SEC || '',
    deviceId: process.env.TRADOVATE_DEVICE_ID || '',
    bufferThreshold: Number(process.env.BUFFER_CLEAR_THRESHOLD ?? '2500'),
  };
  const pollMs = Number(process.env.TELEMETRY_POLL_MS ?? '5000');
  const client = createTelemetryClient(env, { pollMs });
  stopper = client.start(onSnapshot).stop;
  telemetry.running = true;
}

export function stopTelemetryJob() {
  stopper?.();
  telemetry.running = false;
}
