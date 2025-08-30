export class TradovateClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TradovateClientError';
  }
}
