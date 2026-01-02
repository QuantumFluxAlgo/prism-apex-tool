// apps/dashboard/src/lib/apiBase.ts

import { logContractError } from './contractTelemetry';

// Central API base + tolerant JSON fetch helper used by all dashboard data calls.
//
// Goals:
// - Honour VITE_API_BASE (or similar) when present.
// - Work with absolute URLs, relative paths, and mock/test fetch stubs.
// - Tolerate missing status/headers/text/json on mocked Response objects.
// - Return parsed JSON where possible, fall back to raw text/null otherwise.

const resolveEnvApiBase = (): string => {
  try {
    // Vite-style env (import.meta.env.VITE_API_BASE)
    const env: any = (import.meta as any)?.env ?? {};
    const candidates: Array<unknown> = [
      env.VITE_API_BASE,
      env.VITE_API_URL,
      env.VITE_BACKEND_BASE,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  } catch {
    // ignore – we might not be in a Vite/browser env when tests run
  }
  return '';
};

export const API_BASE: string = resolveEnvApiBase();

/**
 * Resolve a relative API path ("/api/tickets") against API_BASE when present.
 * If API_BASE is empty or URL construction fails, fall back to the raw path.
 */
export function resolveApiUrl(path: string): string {
  if (!API_BASE) {
    return path;
  }

  try {
    // If path is already absolute, just return it
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}

type FetchLikeResponse = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: any;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

/**
 * fetchJson
 *
 * Thin wrapper around global fetch that:
 * - Normalises mocked Response objects (missing status/ok/text/json).
 * - Throws a useful Error on non-2xx responses (includes body when available).
 * - Returns parsed JSON where possible, otherwise text or null.
 */
export async function fetchJson<T = any>(
  input: RequestInfo | string,
  init?: RequestInit,
): Promise<T> {
  // Allow callers to pass either absolute URLs or relative API paths.
  const url =
    typeof input === 'string' && input.startsWith('/')
      ? resolveApiUrl(input)
      : input;

  const res = (await fetch(url as RequestInfo, init)) as FetchLikeResponse;

  const status =
    typeof res.status === 'number' && Number.isFinite(res.status)
      ? res.status
      : 200;

  const ok =
    typeof res.ok === 'boolean' ? res.ok : status >= 200 && status < 300;

  const hasJson = typeof res.json === 'function';
  const hasText = typeof res.text === 'function';

  if (!ok) {
    let bodySnippet = '';

    if (hasText) {
      try {
        bodySnippet = await res.text();
      } catch {
        bodySnippet = '';
      }
    } else if (hasJson) {
      try {
        const json = await res.json();
        bodySnippet = JSON.stringify(json);
      } catch {
        bodySnippet = '';
      }
    }

    const statusText =
      typeof res.statusText === 'string' && res.statusText.trim().length > 0
        ? res.statusText.trim()
        : 'Request failed';

    const message = bodySnippet
      ? `${statusText} (${status}) ${bodySnippet}`
      : `${statusText} (${status})`;

    const endpoint =
      typeof url === 'string'
      ? url
      : (typeof (url as any)?.url === 'string' && (url as any)?.url) ||
        (typeof (url as any)?.toString === 'function' ? String(url) : '(unknown)');

    logContractError({
      pageId: 'unknown',
      endpoint,
      status,
      error: new Error(message),
    });

    throw new Error(message);
  }

  // Happy path – prefer true JSON if available.
  if (hasJson) {
    return (await res.json()) as T;
  }

  if (hasText) {
    const text = await res.text();
    if (!text) {
      return null as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // Not valid JSON; return raw text.
      return text as unknown as T;
    }
  }

  // Nothing usable exposed by the mock – return null.
  return null as T;
}
