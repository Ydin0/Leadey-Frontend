"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SignalFilter = "all" | "hiring" | "social" | "funding";

const filters: { key: SignalFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hiring", label: "Hiring" },
  { key: "social", label: "Social" },
  { key: "funding", label: "Funding" },
];

const mockSignalCompanies = [
  { id: "sc1", name: "Ramp", signal: "Posted 12 new sales roles this week", contacts: 8, score: 95, type: "hiring" as const },
  { id: "sc2", name: "Clerk", signal: "Raised $30M Series B", contacts: 5, score: 92, type: "funding" as const },
  { id: "sc3", name: "Webflow", signal: "Added Salesforce to tech stack", contacts: 6, score: 88, type: "hiring" as const },
  { id: "sc4", name: "Postman", signal: "High intent for sales engagement tools", contacts: 4, score: 85, type: "social" as const },
  { id: "sc5", name: "Plaid", signal: "New CRO hired from Gong", contacts: 7, score: 90, type: "hiring" as const },
  { id: "sc6", name: "Neon", signal: "Opened London and Singapore offices", contacts: 3, score: 78, type: "funding" as const },
  { id: "sc7", name: "Cal.com", signal: "CTO posted about needing sales tooling", contacts: 4, score: 70, type: "social" as const },
];

export function SignalsFlow({ onDone }: { onDone: () => void }) {
  const [activeFilter, setActiveFilter] = useState<SignalFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = activeFilter === "all"
    ? mockSignalCompanies
    : mockSignalCompanies.filter((c) => c.type === activeFilter);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedContacts = mockSignalCompanies
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.contacts, 0);

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-ink mb-4">Add from Signals</h3>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
              activeFilter === f.key
                ? "bg-ink text-on-ink"
                : "bg-section text-ink-muted hover:text-ink-secondary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Company List */}
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {filtered.map((company) => (
          <label
            key={company.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-colors",
              selectedIds.has(company.id)
                ? "border-signal-blue-text bg-signal-blue/10"
                : "border-border-subtle bg-surface hover:bg-hover"
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(company.id)}
              onChange={() => toggleSelect(company.id)}
              className="rounded"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-ink">{company.name}</span>
                <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
                  {company.contacts} contacts
                </span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">{company.signal}</p>
            </div>
            <span className={cn(
              "text-[11px] font-semibold",
              company.score >= 90 ? "text-signal-green-text" : company.score >= 80 ? "text-signal-blue-text" : "text-ink-secondary"
            )}>
              {company.score}
            </span>
          </label>
        ))}
      </div>

      {/* Action */}
      <button
        onClick={onDone}
        disabled={selectedIds.size === 0}
        className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
      >
        Add {selectedContacts} Contacts to Funnel
      </button>
    </div>
  );
}
