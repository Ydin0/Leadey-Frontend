"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const mockCompanyList = [
  { id: "ac1", name: "Ramp", industry: "Fintech", contacts: 8, signals: 3 },
  { id: "ac2", name: "Clerk", industry: "Developer Tools", contacts: 5, signals: 2 },
  { id: "ac3", name: "Webflow", industry: "Web Platform", contacts: 6, signals: 1 },
  { id: "ac4", name: "Postman", industry: "Developer Tools", contacts: 4, signals: 2 },
  { id: "ac5", name: "Plaid", industry: "Fintech", contacts: 7, signals: 1 },
  { id: "ac6", name: "Neon", industry: "Database", contacts: 3, signals: 2 },
  { id: "ac7", name: "Cal.com", industry: "Scheduling", contacts: 4, signals: 1 },
  { id: "ac8", name: "Linear", industry: "Project Management", contacts: 5, signals: 1 },
  { id: "ac9", name: "Supabase", industry: "Database", contacts: 6, signals: 2 },
  { id: "ac10", name: "Vercel", industry: "Cloud Platform", contacts: 7, signals: 3 },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function CompaniesFlow({ onDone }: { onDone: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return mockCompanyList;
    const q = search.toLowerCase();
    return mockCompanyList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
    );
  }, [search]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedContacts = mockCompanyList
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.contacts, 0);

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-ink mb-4">Add from Companies</h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-full pl-9 pr-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
        />
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
            <div className="w-8 h-8 rounded-full bg-section flex items-center justify-center shrink-0">
              <span className="text-[10px] font-medium text-ink-muted">{getInitials(company.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-ink">{company.name}</span>
                <span className="text-[10px] text-ink-muted">{company.industry}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-ink-muted">{company.contacts} contacts</span>
                <span className="text-[10px] text-ink-muted">{company.signals} signals</span>
              </div>
            </div>
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
