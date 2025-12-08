// @ts-nocheck
/* PRISM APEX – Worklist V2 data hook
 *
 * Fetches canonical-shaped worklist tickets from /api/worklist.
 * Returns { data, loading, error } in A3 cockpit-friendly format.
 */

import { useEffect, useState } from "react";

export function useWorklist() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        const res = await fetch("/api/worklist");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        // Expected shape: { total, tickets: [...] }
        const rows =
          json?.tickets ??
          json?.rows ??
          Array.isArray(json) ? json : [];

        if (mounted) {
          setData(rows);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}

