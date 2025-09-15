import Ajv from 'ajv';
export const barSchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    ts: { type: 'string' },
    high: { type: 'number' },
    low: { type: 'number' },
    close: { type: 'number' },
    volume: { type: 'number' },
  },
  required: ['symbol', 'ts', 'high', 'low', 'close', 'volume'],
  additionalProperties: false,
} as const;

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
export const validateBar = ajv.compile(barSchema);
