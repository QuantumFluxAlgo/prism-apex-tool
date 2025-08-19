# @prism-apex/sdk

Minimal, typed JS/TS SDK for Prism Apex Tool.

## Install
```bash
npm i @prism-apex/sdk
```

## Usage
```ts
import { PrismClient } from '@prism-apex/sdk';

const api = new PrismClient({ baseUrl: 'http://your-server:8080' });

const health = await api.getHealth();
const tickets = await api.listTickets();

const preview = await api.previewSignal({
  symbol: 'ES', side: 'BUY', entry: 5000, stop: 4990, target: 5010, size: 1, mode: 'evaluation'
});
if (!preview.block) {
  await api.commitTicket({ symbol: 'ES', side: 'BUY', entry: 5000, stop: 4990, target: 5010, size: 1, mode: 'evaluation' });
}
```

This SDK is fetch-based and has no runtime deps. All types mirror the OpenAPI spec (MVP subset).
