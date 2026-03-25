"use client";

import { useState, useCallback, useMemo } from "react";

interface CrossPageSelection {
  selectedIds: Set<string>;
  isAllMatching: boolean;
  showSelectAllBanner: boolean;
  selectedCount: number;
  toggleItem: (id: string) => void;
  togglePageAll: (pageIds: string[]) => void;
  selectAllMatching: () => void;
  clearSelection: () => void;
  getResolvedIds: (allItems: { id: string }[]) => string[];
  isPageFullySelected: (pageIds: string[]) => boolean;
  isSomePageSelected: (pageIds: string[]) => boolean;
}

export function useCrossPageSelection(total: number): CrossPageSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllMatching, setIsAllMatching] = useState(false);

  const toggleItem = useCallback((id: string) => {
    setIsAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePageAll = useCallback((pageIds: string[]) => {
    setIsAllMatching(false);
    setSelectedIds((prev) => {
      const allOnPage = pageIds.every((id) => prev.has(id));
      if (allOnPage) {
        // Deselect page
        const next = new Set(prev);
        for (const id of pageIds) next.delete(id);
        return next;
      }
      // Select page
      const next = new Set(prev);
      for (const id of pageIds) next.add(id);
      return next;
    });
  }, []);

  const selectAllMatching = useCallback(() => {
    setIsAllMatching(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsAllMatching(false);
  }, []);

  const isPageFullySelected = useCallback(
    (pageIds: string[]) => {
      if (isAllMatching) return true;
      return pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    },
    [selectedIds, isAllMatching],
  );

  const isSomePageSelected = useCallback(
    (pageIds: string[]) => {
      if (isAllMatching) return false;
      const full = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
      return !full && pageIds.some((id) => selectedIds.has(id));
    },
    [selectedIds, isAllMatching],
  );

  const selectedCount = isAllMatching ? total : selectedIds.size;

  const showSelectAllBanner = useMemo(() => {
    if (isAllMatching) return false;
    if (selectedIds.size === 0) return false;
    return selectedIds.size < total;
  }, [selectedIds.size, isAllMatching, total]);

  const getResolvedIds = useCallback(
    (allItems: { id: string }[]) => {
      if (isAllMatching) return allItems.map((i) => i.id);
      return Array.from(selectedIds);
    },
    [selectedIds, isAllMatching],
  );

  return {
    selectedIds,
    isAllMatching,
    showSelectAllBanner,
    selectedCount,
    toggleItem,
    togglePageAll,
    selectAllMatching,
    clearSelection,
    getResolvedIds,
    isPageFullySelected,
    isSomePageSelected,
  };
}
