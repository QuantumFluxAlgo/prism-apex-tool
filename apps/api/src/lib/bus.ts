import { EventEmitter } from 'events';

export type Topics =
  | 'bars.1m'
  | 'bars.5m'
  | 'quotes.last'
  | 'meta.contract'
  | 'suggestion';

const emitter = new EventEmitter();

export function publish<T>(topic: Topics, payload: T): void {
  emitter.emit(topic, payload);
}

export function subscribe<T>(topic: Topics, handler: (payload: T) => void): () => void {
  emitter.on(topic, handler);
  return () => emitter.off(topic, handler);
}
