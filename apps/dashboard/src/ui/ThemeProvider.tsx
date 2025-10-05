import React, { useEffect, useState, createContext, useContext } from 'react';

type Mode = 'dark' | 'light';
const ThemeCtx = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({ mode: 'dark', setMode: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');
  useEffect(() => {
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [mode]);
  return <ThemeCtx.Provider value={{ mode, setMode }}>{children}</ThemeCtx.Provider>;
}
