"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBuilder } from "./filter-builder";
import { createSavedSearch, updateSavedSearch } from "@/lib/api/scrapers";
import type { TheirStackFilters } from "@/lib/types/scraper";

interface SearchBuilderShellProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    searchName: string;
    filters: TheirStackFilters;
    frequency?: string;
    enabled?: boolean;
    maxSignalsPerRun?: number;
  };
}

export function SearchBuilderShell({ mode, initialData }: SearchBuilderShellProps) {
  const router = useRouter();
  const [searchName, setSearchName] = useState(initialData?.searchName || "");
  const [filters, setFilters] = useState<TheirStackFilters>(initialData?.filters || { posted_at_max_age_days: 7 });
  const [frequency, setFrequency] = useState(initialData?.frequency || "daily");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [maxSignalsPerRun, setMaxSignalsPerRun] = useState(initialData?.maxSignalsPerRun ?? 100);
  const [saving, setSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const hasJobTitles = (filters.job_title_pattern_or?.length ?? 0) > 0 || (filters.job_title_or?.length ?? 0) > 0;
  const canSave = hasJobTitles && (filters.job_country_code_or?.length ?? 0) > 0 && searchName.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (mode === "edit" && initialData?.id) {
        await updateSavedSearch(initialData.id, {
          searchName,
          filters,
          frequency,
          enabled,
          maxSignalsPerRun,
        });
        router.push(`/dashboard/scrapers/${initialData.id}`);
        router.refresh();
      } else {
        const result = await createSavedSearch({
          searchName,
          filters,
          frequency,
          enabled,
          maxSignalsPerRun,
        });
        router.push(`/dashboard/scrapers/${result.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, mode, initialData, searchName, filters, frequency, enabled, maxSignalsPerRun, router]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-hover/50 text-ink-muted transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-[17px] font-semibold text-ink">
          {mode === "edit" ? "Edit Search" : "New Search"}
        </h1>
      </div>

      {/* Search Name */}
      <div className="mb-5">
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Search Name</label>
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="e.g. US SDR Hiring, EU Sales Leaders..."
          className="w-full px-3 py-2.5 rounded-[10px] bg-section text-[13px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint"
        />
      </div>

      {/* Filters */}
      <FilterBuilder filters={filters} onChange={setFilters} />

      {/* Schedule & Limits Section (collapsible) */}
      <div className="mt-5 bg-surface rounded-[14px] border border-border-subtle">
        <button
          type="button"
          onClick={() => setScheduleOpen(!scheduleOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Schedule & Limits</span>
          {scheduleOpen ? <ChevronUp size={14} className="text-ink-muted" /> : <ChevronDown size={14} className="text-ink-muted" />}
        </button>
        {scheduleOpen && (
          <div className="px-4 pb-4 space-y-4">
            {/* Frequency */}
            <div>
              <label className="block text-[10px] text-ink-faint mb-2">Frequency</label>
              <div className="flex gap-1.5">
                {(["daily", "weekly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
                      frequency === f
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Max results */}
            <div>
              <label className="block text-[10px] text-ink-faint mb-2">Max Results Per Run</label>
              <input
                type="number"
                value={maxSignalsPerRun}
                onChange={(e) => setMaxSignalsPerRun(Math.max(1, Math.min(500, Number(e.target.value))))}
                className="w-32 px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
              />
            </div>

            {/* Auto-run toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-secondary">Auto-run on schedule</span>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors",
                  enabled ? "bg-signal-blue-text" : "bg-section border border-border-subtle"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-surface shadow transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation messages */}
      <div className="mt-4 space-y-1">
        {searchName.trim().length === 0 && (
          <p className="text-[11px] text-signal-red-text">Search name is required.</p>
        )}
        {!hasJobTitles && (
          <p className="text-[11px] text-signal-red-text">At least one job title is required.</p>
        )}
        {(filters.job_country_code_or?.length ?? 0) === 0 && (
          <p className="text-[11px] text-signal-red-text">Select at least one country.</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2 rounded-[20px] text-[11px] font-medium transition-colors",
            canSave && !saving
              ? "bg-ink text-on-ink hover:bg-ink/90"
              : "bg-section text-ink-faint cursor-not-allowed"
          )}
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {mode === "edit" ? "Save Changes" : "Save Search"}
        </button>
      </div>
    </div>
  );
}
