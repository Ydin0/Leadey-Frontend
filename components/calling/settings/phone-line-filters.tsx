"use client";

import type { PhoneLineStatus } from "@/lib/types/calling";
import { countryOptions } from "@/lib/constants/calling";

export interface PhoneLineFilterState {
  status: PhoneLineStatus | "all";
  country: string; // countryCode or "all"
  assignment: "all" | "assigned" | "unassigned";
}

interface PhoneLineFiltersProps {
  filters: PhoneLineFilterState;
  onChange: (filters: PhoneLineFilterState) => void;
}

export function PhoneLineFilters({ filters, onChange }: PhoneLineFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as PhoneLineFilterState["status"] })}
        className="px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="pending">Pending</option>
        <option value="released">Released</option>
      </select>

      <select
        value={filters.country}
        onChange={(e) => onChange({ ...filters, country: e.target.value })}
        className="px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      >
        <option value="all">All Countries</option>
        {countryOptions.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>

      <select
        value={filters.assignment}
        onChange={(e) => onChange({ ...filters, assignment: e.target.value as PhoneLineFilterState["assignment"] })}
        className="px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      >
        <option value="all">All Assignments</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
      </select>
    </div>
  );
}
