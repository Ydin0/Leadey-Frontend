"use client";

import { useMemo, useCallback, useEffect } from "react";
import type { SearchResultRow } from "@/lib/types/scraper";
import type { JobsFilterState, CompaniesFilterState, UniqueCompany } from "./filter-types";
import { DEFAULT_JOBS_FILTER, DEFAULT_COMPANIES_FILTER } from "./filter-types";
import { applyJobsFilters, applyCompaniesFilters, isJobsFilterEmpty, isCompaniesFilterEmpty } from "./filter-utils";
import { useUrlJsonState } from "@/lib/hooks/use-url-state";

// ─── Jobs Inline Filters ─────────────────────────────────────────────

export function useJobsInlineFilters(allResults: SearchResultRow[], activeRunId: string | null) {
  const [filters, setFilters] = useUrlJsonState<JobsFilterState>("jf", DEFAULT_JOBS_FILTER);

  // Reset when run changes
  useEffect(() => {
    setFilters(DEFAULT_JOBS_FILTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRunId]);

  const isEmpty = isJobsFilterEmpty(filters);

  const filteredRows = useMemo(() => {
    if (isEmpty) return allResults;
    return applyJobsFilters(allResults, filters);
  }, [allResults, filters, isEmpty]);

  const updateFilter = useCallback(<K extends keyof JobsFilterState>(
    key: K,
    value: JobsFilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, [setFilters]);

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_JOBS_FILTER);
  }, [setFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearAll,
    isEmpty,
    filteredRows,
  };
}

// ─── Companies Inline Filters ────────────────────────────────────────

export function useCompaniesInlineFilters(uniqueCompanies: UniqueCompany[]) {
  const [filters, setFilters] = useUrlJsonState<CompaniesFilterState>("cf", DEFAULT_COMPANIES_FILTER);

  const isEmpty = isCompaniesFilterEmpty(filters);

  const filteredCompanies = useMemo(() => {
    if (isEmpty) return uniqueCompanies;
    return applyCompaniesFilters(uniqueCompanies, filters);
  }, [uniqueCompanies, filters, isEmpty]);

  const updateFilter = useCallback(<K extends keyof CompaniesFilterState>(
    key: K,
    value: CompaniesFilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, [setFilters]);

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_COMPANIES_FILTER);
  }, [setFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearAll,
    isEmpty,
    filteredCompanies,
  };
}
