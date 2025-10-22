import '@testing-library/jest-dom';

if (typeof window !== 'undefined' && !window.matchMedia) {
  // Minimal matchMedia polyfill for components that read system theme.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
