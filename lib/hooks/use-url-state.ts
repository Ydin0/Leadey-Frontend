"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Module-level pending updates + flush scheduling so multiple setState
// calls in the same tick batch into a single router.replace().
let pendingUpdates: Record<string, string | null> = {};
let flushScheduled = false;
let flushFn: (() => void) | null = null;

function scheduleBatchFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // Use queueMicrotask so all sync calls in the same handler batch together
  queueMicrotask(() => {
    flushScheduled = false;
    flushFn?.();
    pendingUpdates = {};
  });
}

function useUrlUpdater() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Keep refs so the flush function always sees the latest values
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  // Register the flush function (last rendered component wins, which is fine
  // since they all share the same router/pathname/searchParams)
  flushFn = () => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    for (const [k, v] of Object.entries(pendingUpdates)) {
      if (v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current, { scroll: false });
  };

  const update = useCallback((key: string, value: string | null) => {
    pendingUpdates[key] = value;
    scheduleBatchFlush();
  }, []);

  return { searchParams, update };
}

// ─── String state ─────────────────────────────────────────────────────

export function useUrlState(key: string, defaultValue: string) {
  const { searchParams, update } = useUrlUpdater();

  // Check pending updates first (for reads within the same tick as writes)
  const pending = pendingUpdates[key];
  const value = pending !== undefined
    ? (pending === null ? defaultValue : pending)
    : (searchParams.get(key) ?? defaultValue);

  const setValue = useCallback(
    (v: string) => {
      update(key, v === defaultValue ? null : v);
    },
    [key, defaultValue, update],
  );

  return [value, setValue] as const;
}

// ─── Number state ─────────────────────────────────────────────────────

export function useUrlNumberState(key: string, defaultValue: number) {
  const { searchParams, update } = useUrlUpdater();

  const pending = pendingUpdates[key];
  const value = pending !== undefined
    ? (pending === null ? defaultValue : Number(pending))
    : (searchParams.get(key) !== null ? Number(searchParams.get(key)) : defaultValue);

  const setValue = useCallback(
    (v: number) => {
      update(key, v === defaultValue ? null : String(v));
    },
    [key, defaultValue, update],
  );

  return [value, setValue] as const;
}

// ─── JSON state (base64-encoded diff from defaults) ───────────────────

function encodeJsonDiff<T extends object>(
  current: T,
  defaults: T,
): string | null {
  const c = current as Record<string, unknown>;
  const d = defaults as Record<string, unknown>;
  const diff: Record<string, unknown> = {};
  let hasDiff = false;
  for (const key of Object.keys(d)) {
    if (JSON.stringify(c[key]) !== JSON.stringify(d[key])) {
      diff[key] = c[key];
      hasDiff = true;
    }
  }
  if (!hasDiff) return null;
  try {
    return btoa(JSON.stringify(diff));
  } catch {
    return null;
  }
}

function decodeJsonDiff<T extends object>(
  encoded: string | null,
  defaults: T,
): T {
  if (!encoded) return defaults;
  try {
    const diff = JSON.parse(atob(encoded)) as Partial<T>;
    return { ...defaults, ...diff };
  } catch {
    return defaults;
  }
}

export function useUrlJsonState<T extends object>(
  key: string,
  defaultValue: T,
) {
  const { searchParams, update } = useUrlUpdater();

  const pending = pendingUpdates[key];
  const raw = pending !== undefined ? pending : searchParams.get(key);

  const value = useMemo(
    () => decodeJsonDiff(raw, defaultValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw],
  );

  const setValue = useCallback(
    (v: T | ((prev: T) => T)) => {
      const currentRaw = pendingUpdates[key] !== undefined ? pendingUpdates[key] : searchParams.get(key);
      const next = typeof v === "function" ? v(decodeJsonDiff(currentRaw, defaultValue)) : v;
      update(key, encodeJsonDiff(next, defaultValue));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, update, searchParams],
  );

  return [value, setValue] as const;
}
