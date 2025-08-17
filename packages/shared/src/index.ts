export type Placeholder = {
  readonly message: string;
};

export function hello(name: string): string {
  return `Hello, ${name}!`;
}

export * from './types.js';
export * from './time.js';
export * from './series.js';
