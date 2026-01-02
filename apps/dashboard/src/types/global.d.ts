/* eslint-disable */
/* Lightweight DOM-ish shims for type-only happiness */
interface Clipboard {
  readText(): Promise<string>;
  writeText(data: string): Promise<void>;
}
interface Navigator {
  clipboard?: Clipboard;
}
declare const navigator: Navigator;

declare global {
  interface Window {
    __APP_VERSION__?: string;
  }
}
export {};
