"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Loader2,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { RangeSlider } from "@/components/shared/range-slider";
import { TagInput } from "@/components/shared/tag-input";
import { estimateScraperDailyUsage } from "@/lib/scraper-estimation";
import type {
  ScraperAssignment,
  ScraperCategory,
  ScraperDefinition,
  ScraperFrequency,
  ScraperSourceId,
} from "@/lib/types/scraper";
import { SourceSitePill } from "./source-site-pill";

const statusConfig = {
  running: {
    icon: Loader2,
    text: "Running",
    color: "text-signal-blue-text",
    animate: "animate-spin",
  },
  completed: {
    icon: Check,
    text: "Completed",
    color: "text-signal-green-text",
    animate: "",
  },
  idle: { icon: Clock, text: "Idle", color: "text-ink-muted", animate: "" },
  error: { icon: Clock, text: "Error", color: "text-signal-red-text", animate: "" },
} as const;

const categoryLabels: Record<ScraperCategory, string> = {
  jobs: "Job Monitoring",
  funding: "Funding",
  tech: "Tech Stack",
  intent: "Intent",
  social: "Social Listening",
  news: "News",
  people: "People Changes",
  traffic: "Traffic",
};

const languageOptions = ["English", "Spanish", "French", "German"];
const fallbackFrequencies: ScraperFrequency[] = ["daily", "weekly"];

interface ScraperActiveRowProps {
  assignment: ScraperAssignment;
  definition?: ScraperDefinition;
  onSaveConfig: (assignment: ScraperAssignment) => void;
}

export function ScraperActiveRow({
  assignment,
  definition,
  onSaveConfig,
}: ScraperActiveRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ScraperAssignment>(assignment);

  const statusCfg = statusConfig[assignment.status];
  const StatusIcon = statusCfg.icon;
  const category = definition?.category ?? "social";
  const availableSources = definition?.sourceIds ?? assignment.sourceIds;
  const availableFrequencies = definition?.frequencyOptions ?? fallbackFrequencies;

  const activeConfig = editing ? draft : assignment;
  const estimate = useMemo(
    () => estimateScraperDailyUsage(activeConfig, category),
    [activeConfig, category]
  );
  const sourceEstimateById = useMemo(
    () => new Map(estimate.sourceBreakdown.map((item) => [item.source, item])),
    [estimate.sourceBreakdown]
  );

  const canSave =
    draft.sourceIds.length > 0 &&
    draft.sourceIds.every((source) => (draft.sourceSignalLimits[source] ?? 0) > 0) &&
    draft.countries.length > 0 &&
    draft.languages.length > 0 &&
    draft.maxSignalsPerRun > 0;

  function beginEdit() {
    setDraft(assignment);
    setExpanded(true);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(assignment);
    setEditing(false);
  }

  function saveEdit() {
    if (!canSave) return;
    onSaveConfig(draft);
    setEditing(false);
  }

  function setFrequency(frequency: ScraperFrequency) {
    setDraft((prev) => ({ ...prev, frequency }));
  }

  function setSourceLimit(source: ScraperSourceId, value: number) {
    setDraft((prev) => ({
      ...prev,
      sourceSignalLimits: {
        ...prev.sourceSignalLimits,
        [source]: Math.max(0, value),
      },
    }));
  }

  function toggleSource(source: ScraperSourceId) {
    setDraft((prev) => {
      const isSelected = prev.sourceIds.includes(source);
      const nextSourceIds = isSelected
        ? prev.sourceIds.filter((id) => id !== source)
        : [...prev.sourceIds, source];
      const nextLimits = { ...prev.sourceSignalLimits };
      if (!isSelected && (nextLimits[source] ?? 0) === 0) {
        nextLimits[source] = 20;
      }
      return { ...prev, sourceIds: nextSourceIds, sourceSignalLimits: nextLimits };
    });
  }

  function toggleLanguage(language: string) {
    setDraft((prev) => {
      const exists = prev.languages.includes(language);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((lang) => lang !== language)
          : [...prev.languages, language],
      };
    });
  }

  function setFlag(
    field:
      | "onlyDecisionMakers"
      | "dedupeCompanies"
      | "includeRemoteRoles"
      | "notifyOnHighIntent"
  ) {
    setDraft((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-hover/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className={cn("flex items-center gap-1.5 w-24 shrink-0", statusCfg.color)}>
          <StatusIcon size={12} strokeWidth={1.5} className={statusCfg.animate} />
          <span className="text-[10px] font-medium">{statusCfg.text}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-ink">{assignment.scraperName}</span>
            <span className="text-[10px] text-ink-faint">{assignment.frequency}</span>
            <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-section text-ink-muted">
              {categoryLabels[category]}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {assignment.sourceIds.slice(0, 5).map((source) => (
              <SourceSitePill key={source} source={source} compact />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[10px] text-ink-muted">
            ~{estimate.signalsPerDay} signals/day
          </span>
          <span className="text-[10px] text-ink-muted font-medium">
            ~{estimate.creditsPerDay} credits/day
          </span>
          {assignment.lastRun && (
            <span className="text-[10px] text-ink-faint">
              {formatRelativeTime(assignment.lastRun)}
            </span>
          )}
        </div>

        {expanded ? (
          <ChevronUp size={12} className="text-ink-muted" />
        ) : (
          <ChevronDown size={12} className="text-ink-muted" />
        )}
      </div>

      {expanded && (
        <div className="px-4 py-4 border-t border-border-subtle bg-section/30 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-[12px] border border-border-subtle bg-surface px-3 py-2">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Estimated Daily Credits</p>
              <p className="text-[14px] text-ink font-semibold mt-1">{estimate.creditsPerDay}</p>
            </div>
            <div className="rounded-[12px] border border-border-subtle bg-surface px-3 py-2">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Estimated Daily Signals</p>
              <p className="text-[14px] text-ink font-semibold mt-1">{estimate.signalsPerDay}</p>
            </div>
            <div className="rounded-[12px] border border-border-subtle bg-surface px-3 py-2">
              <p className="text-[10px] text-ink-faint uppercase tracking-wider">Credits Per Run</p>
              <p className="text-[14px] text-ink font-semibold mt-1">{estimate.creditsPerRun}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-ink-muted">
              Configured {formatRelativeTime(assignment.configuredAt)}
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  type="button"
                  onClick={beginEdit}
                  className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors"
                >
                  Edit Config
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors"
                  >
                    <RotateCcw size={10} strokeWidth={2} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={!canSave}
                    className="flex items-center gap-1 px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save size={10} strokeWidth={2} />
                    Save Config
                  </button>
                </>
              )}
              <button className="flex items-center gap-1 px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors">
                <Play size={10} strokeWidth={2} />
                Run Now
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium">
                    Data Sources
                  </label>
                  <span className="text-[10px] text-ink-faint">
                    {draft.sourceIds.length} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {availableSources.map((source) => {
                    const selected = draft.sourceIds.includes(source);
                    const perRunLimit = draft.sourceSignalLimits[source] ?? 0;
                    const sourceEstimate = sourceEstimateById.get(source);

                    return (
                      <div
                        key={source}
                        className={cn(
                          "rounded-[12px] border px-3 py-2 transition-colors",
                          selected
                            ? "bg-signal-blue/10 border-signal-blue-text/40"
                            : "bg-surface border-border-subtle"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSource(source)}
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                              selected
                                ? "bg-signal-blue-text border-signal-blue-text"
                                : "border-border-default bg-surface"
                            )}
                          >
                            {selected && (
                              <Check size={11} strokeWidth={2.5} className="text-white" />
                            )}
                          </button>
                          <SourceSitePill source={source} selected={selected} />
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-[10px] text-ink-faint">Signals / run</span>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              disabled={!selected}
                              value={perRunLimit}
                              onChange={(e) =>
                                setSourceLimit(source, Number(e.target.value) || 0)
                              }
                              className={cn(
                                "w-20 px-2 py-1 rounded-[8px] text-[11px] outline-none border",
                                selected
                                  ? "bg-surface text-ink border-border-default focus:border-signal-blue-text/40"
                                  : "bg-section text-ink-faint border-border-subtle"
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pl-8">
                          <span
                            className={cn(
                              "text-[10px]",
                              selected ? "text-ink-muted" : "text-ink-faint"
                            )}
                          >
                            {selected ? "Platform active" : "Platform disabled"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              selected ? "text-ink-secondary" : "text-ink-faint"
                            )}
                          >
                            {selected
                              ? `~${sourceEstimate?.creditsPerDay ?? 0} credits/day`
                              : "0 credits/day"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                      Frequency
                    </label>
                    <div className="flex items-center gap-1">
                      {availableFrequencies.map((frequency) => (
                        <button
                          key={frequency}
                          type="button"
                          onClick={() => setFrequency(frequency)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                            draft.frequency === frequency
                              ? "bg-ink text-on-ink"
                              : "bg-section text-ink-muted hover:text-ink-secondary"
                          )}
                        >
                          {frequency}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeSlider
                    label="Lookback Window"
                    min={1}
                    max={30}
                    value={draft.lookbackDays}
                    onChange={(value) =>
                      setDraft((prev) => ({ ...prev, lookbackDays: value }))
                    }
                    formatValue={(value) => `${value} days`}
                  />
                  <RangeSlider
                    label="Minimum Signal Score"
                    min={50}
                    max={100}
                    value={draft.minSignalScore}
                    onChange={(value) =>
                      setDraft((prev) => ({ ...prev, minSignalScore: value }))
                    }
                    formatValue={(value) => `${value}+`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                    Max Signals / Run
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={draft.maxSignalsPerRun}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        maxSignalsPerRun: Number(e.target.value) || 10,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TagInput
                  label="Include Keywords"
                  tags={draft.keywords}
                  onChange={(keywords) => setDraft((prev) => ({ ...prev, keywords }))}
                  placeholder="Add must-match keywords..."
                />
                <TagInput
                  label="Exclude Keywords"
                  tags={draft.excludedKeywords}
                  onChange={(excludedKeywords) =>
                    setDraft((prev) => ({ ...prev, excludedKeywords }))
                  }
                  placeholder="Add noise filters..."
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                    Keyword Logic
                  </label>
                  <div className="flex items-center gap-1">
                    {(["any", "all"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, keywordMatchMode: mode }))
                        }
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                          draft.keywordMatchMode === mode
                            ? "bg-signal-blue text-signal-blue-text"
                            : "bg-section text-ink-muted hover:text-ink-secondary"
                        )}
                      >
                        Match {mode === "any" ? "Any" : "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <TagInput
                  label="Countries"
                  tags={draft.countries}
                  onChange={(countries) => setDraft((prev) => ({ ...prev, countries }))}
                  placeholder="United States, UK, Germany..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                  Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                        draft.languages.includes(language)
                          ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                          : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                      )}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                  Guardrails
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFlag("onlyDecisionMakers")}
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                      draft.onlyDecisionMakers
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                    )}
                  >
                    <ShieldCheck size={11} strokeWidth={1.8} />
                    Decision Makers Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlag("dedupeCompanies")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                      draft.dedupeCompanies
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                    )}
                  >
                    De-duplicate Companies
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlag("includeRemoteRoles")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                      draft.includeRemoteRoles
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                    )}
                  >
                    Include Remote Roles
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlag("notifyOnHighIntent")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                      draft.notifyOnHighIntent
                        ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                        : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
                    )}
                  >
                    Notify High Intent
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px]">
              <div>
                <label className="block text-[10px] text-ink-faint mb-1">Sources & Limits</label>
                <div className="space-y-1.5">
                  {assignment.sourceIds.map((source) => (
                    <div key={source} className="flex items-center justify-between">
                      <SourceSitePill source={source} compact />
                      <span className="text-ink-secondary">
                        {assignment.sourceSignalLimits[source] ?? 0} / run
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint mb-1">Run Controls</label>
                <p className="text-ink-secondary">
                  {assignment.frequency}, {assignment.lookbackDays}d lookback, min score{" "}
                  {assignment.minSignalScore}
                </p>
                <p className="text-ink-muted mt-1">
                  Max {assignment.maxSignalsPerRun} signals/run
                </p>
              </div>
              <div>
                <label className="block text-[10px] text-ink-faint mb-1">Cost Forecast</label>
                <p className="text-ink-secondary flex items-center gap-1">
                  <Coins size={12} strokeWidth={1.8} />
                  ~{estimate.creditsPerDay} credits/day
                </p>
                <p className="text-ink-muted mt-1">~{estimate.signalsPerDay} signals/day</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
