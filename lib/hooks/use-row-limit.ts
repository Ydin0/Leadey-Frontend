"use client";

import { useState, useMemo, useCallback } from "react";

export function useRowLimit<T>(items: T[], onPageReset?: () => void) {
  const [startingRow, setStartingRow] = useState(0);
  const [rowLimit, setRowLimit] = useState<number | null>(null);

  const limited = useMemo(() => {
    const start = Math.min(startingRow, items.length);
    if (rowLimit !== null) {
      return items.slice(start, start + rowLimit);
    }
    return items.slice(start);
  }, [items, startingRow, rowLimit]);

  const handleRowLimitChange = useCallback((newStart: number, newLimit: number | null) => {
    setStartingRow(newStart);
    setRowLimit(newLimit);
    onPageReset?.();
  }, [onPageReset]);

  return {
    limited,
    startingRow,
    rowLimit,
    unfilteredTotal: items.length,
    handleRowLimitChange,
  };
}
