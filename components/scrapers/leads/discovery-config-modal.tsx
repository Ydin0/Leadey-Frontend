"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/shared/tag-input";
import type { DiscoveryConfig } from "@/lib/types/contact";

const SUGGESTED_ROLES = [
  "CTO", "VP Engineering", "VP Sales", "Head of Engineering",
  "Head of Growth", "Director of Engineering", "Director of Sales",
  "Founder", "CEO", "COO", "CFO", "CMO",
];

const SENIORITY_LEVELS = [
  "C-Level", "VP", "Director", "Head", "Manager", "Senior",
];

interface DiscoveryConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: DiscoveryConfig) => void;
  companiesWithLinkedIn: number;
  companyLinkedinUrls?: string[];
  submitting?: boolean;
  /** Error from the last submit attempt — shown in the modal. */
  error?: string | null;
}

export function DiscoveryConfigModal({
  open,
  onClose,
  onSubmit,
  companiesWithLinkedIn,
  companyLinkedinUrls,
  submitting,
  error,
}: DiscoveryConfigModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["CTO", "VP Engineering", "Founder", "CEO", "Head of Engineering"]);
  const [selectedSeniority, setSelectedSeniority] = useState<string[]>(["C-Level", "VP", "Director", "Head", "Manager", "Senior"]);
  const [maxPerCompany, setMaxPerCompany] = useState(5);
  const [maxTotal, setMaxTotal] = useState(() => companiesWithLinkedIn * 5);
  const [maxTotalManuallySet, setMaxTotalManuallySet] = useState(false);

  // Auto-update maxTotal when maxPerCompany or company count changes (unless user manually edited it)
  useEffect(() => {
    if (!maxTotalManuallySet) {
      setMaxTotal(companiesWithLinkedIn * maxPerCompany);
    }
  }, [maxPerCompany, companiesWithLinkedIn, maxTotalManuallySet]);

  if (!open) return null;

  const calculatedMax = companiesWithLinkedIn * maxPerCompany;
  const estimatedContacts = Math.min(calculatedMax, maxTotal);
  const estimatedCost = ((estimatedContacts / 1000) * 4).toFixed(2);

  function toggleSeniority(level: string) {
    setSelectedSeniority((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  }

  function handleMaxPerCompanyChange(value: number) {
    setMaxPerCompany(value);
  }

  function handleMaxTotalChange(value: number) {
    setMaxTotal(value);
    setMaxTotalManuallySet(true);
  }

  function handleSubmit() {
    onSubmit({
      targetRoles: selectedRoles,
      seniorityLevels: selectedSeniority,
      maxPerCompany,
      maxTotal,
      ...(companyLinkedinUrls?.length ? { companyLinkedinUrls } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-[14px] border border-border-subtle shadow-xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-hover transition-colors"
        >
          <X size={16} className="text-ink-muted" />
        </button>

        <h2 className="text-[15px] font-semibold text-ink mb-1">Find Decision Makers</h2>
        <p className="text-[12px] text-ink-muted mb-5">
          Discover contacts at {companiesWithLinkedIn} companies with LinkedIn profiles
        </p>

        {/* Target Roles */}
        <div className="mb-4">
          <TagInput
            label="Target Roles"
            tags={selectedRoles}
            onChange={setSelectedRoles}
            placeholder="Type a role and press Enter..."
            suggestions={SUGGESTED_ROLES}
          />
        </div>

        {/* Seniority Levels */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2 block">
            Seniority Levels
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SENIORITY_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => toggleSeniority(level)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
                  selectedSeniority.includes(level)
                    ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                    : "bg-surface text-ink-muted border-border-subtle hover:bg-hover",
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">
              Max per company
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxPerCompany}
              onChange={(e) => handleMaxPerCompanyChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5 block">
              Max total
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={maxTotal}
              onChange={(e) => handleMaxTotalChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-accent"
            />
            {maxTotalManuallySet && maxTotal < calculatedMax && (
              <button
                onClick={() => { setMaxTotal(calculatedMax); setMaxTotalManuallySet(false); }}
                className="text-[10px] text-signal-blue-text hover:underline mt-1"
              >
                Reset to {calculatedMax} ({companiesWithLinkedIn} x {maxPerCompany})
              </button>
            )}
          </div>
        </div>

        {/* Cost estimate */}
        <div className="rounded-[10px] bg-section border border-border-subtle px-4 py-3 mb-5">
          <p className="text-[11px] text-ink-secondary">
            {companiesWithLinkedIn} companies x up to {maxPerCompany} contacts = ~{estimatedContacts.toLocaleString()} profiles
          </p>
          <p className="text-[12px] font-medium text-ink mt-0.5">
            Estimated cost: ${estimatedCost}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[10px] bg-signal-red/10 border border-signal-red-text/20 px-4 py-2.5 mb-3">
            <p className="text-[11px] text-signal-red-text">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[20px] text-[11px] font-medium text-ink-muted hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedRoles.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-[20px] text-[11px] font-medium bg-ink text-on-ink hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Search size={12} />
            )}
            Start Discovery
          </button>
        </div>
      </div>
    </div>
  );
}
