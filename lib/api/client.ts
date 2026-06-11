const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

let _authToken: string | null = null;

/** Called by AuthTokenSync to keep the Bearer token fresh */
export function setAuthToken(token: string | null) {
  _authToken = token;
}

/** Get the current auth token for non-JSON requests (e.g., file uploads) */
export function getAuthToken(): string | null {
  return _authToken;
}

/** Transient backend statuses worth retrying — Railway restarts/cold-starts
 *  surface as 502/503/504, and 429 is a momentary rate limit. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [300, 800, 1500];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A GET (or method-less) request is safe to retry; mutations are not (a
 *  retried POST could double-apply, e.g. advancing the dialer twice). */
function isRetryableMethod(init?: RequestInit): boolean {
  const method = (init?.method || "GET").toUpperCase();
  return method === "GET";
}

/**
 * Shared fetch + parse with bounded retries for transient failures. Only GET
 * requests retry; everything else fails fast exactly as before. Returns the
 * parsed JSON payload (unwrapping `.data` is left to the callers).
 */
async function doRequest(path: string, init?: RequestInit): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  const retryable = isRetryableMethod(init);

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${path}`, {
        ...init,
        headers,
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // Retry transient server states on safe (GET) requests only.
        if (retryable && RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
          await sleep(RETRY_BACKOFF_MS[attempt] ?? 1500);
          continue;
        }
        const message = payload?.error?.message || `Request failed (${response.status})`;
        throw new Error(message);
      }

      return payload;
    } catch (err) {
      // A `fetch` rejection (network down, backend unreachable, CORS/abort)
      // throws a TypeError with no response. Retry safe requests; otherwise
      // surface a clearer message than the raw "Failed to fetch (host)".
      const isNetworkError = err instanceof TypeError;
      if (isNetworkError && retryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? 1500);
        continue;
      }
      if (isNetworkError) {
        throw new Error("Can't reach the server — check your connection and retry");
      }
      throw err;
    }
  }
}

/** Returns the raw JSON payload (not unwrapped) — for endpoints that return { data, meta } */
export async function apiRequestRaw<T>(path: string, init?: RequestInit): Promise<T> {
  return (await doRequest(path, init)) as T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = (await doRequest(path, init)) as { data?: unknown } | null;
  return payload?.data as T;
}
