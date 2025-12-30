// @ts-nocheck
/* PRISM APEX – Worklist V2 data hook */

import { useEffect, useState } from "react";
import { fetchWorklistFeed, type WorklistApiResponse } from "../lib/api";

export function useWorklist() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        const json: WorklistApiResponse | null = await fetchWorklistFeed();
        if (!json) {
          throw new Error("Worklist feed unavailable");
        }

        const rows = Array.isArray(json?.tickets)
          ? json?.tickets
          : Array.isArray(json?.rows)
          ? json?.rows
          : [];

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
