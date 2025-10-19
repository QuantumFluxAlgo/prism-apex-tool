import { useEffect, useState } from 'react';
import type { SymbolSpecV2 } from '../lib/api';
import { getSymbolSpecsV2 } from '../lib/api';

export function useSymbolSpecs() {
  const [data, setData] = useState<SymbolSpecV2[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const specs = await getSymbolSpecsV2();
        if (active) setData(specs);
      } catch (err) {
        if (active) setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const total = data?.length ?? 0;
  const verified = data?.filter((spec) => spec.tickSpecVerified).length ?? 0;

  return { data, error, total, verified };
}
