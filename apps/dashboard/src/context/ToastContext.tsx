import React, { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; text: string };

const ToastCtx = createContext<{ toast: (text: string) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto rounded-lg bg-black/80 px-3 py-2 text-sm text-white shadow-lg"
          >
            {item.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
