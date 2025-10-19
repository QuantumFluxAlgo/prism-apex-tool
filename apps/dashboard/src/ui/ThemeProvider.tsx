import React, { useCallback, useEffect, useMemo, useState, createContext, useContext } from 'react';

type Mode = 'dark' | 'light';
type ThemeContextValue = {
  mode: Mode;
  setMode: (mode: Mode) => void;
};

const STORAGE_KEY = 'apex.theme';

function readStoredMode(): Mode | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getSystemMode(): Mode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const ThemeCtx = createContext<ThemeContextValue>({ mode: 'dark', setMode: () => {} });

export const useTheme = () => useContext(ThemeCtx);

function applyMode(mode: Mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    root.classList.remove('dark');
  } else {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'dark';
    root.classList.add('dark');
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => readStoredMode() ?? getSystemMode());

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (event: MediaQueryListEvent) => {
      if (typeof window === 'undefined') return;
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        // ignore storage access errors
      }
      setModeState(event.matches ? 'light' : 'dark');
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }

    if (typeof media.addListener === 'function') {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }

    return undefined;
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    applyMode(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage write errors
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
