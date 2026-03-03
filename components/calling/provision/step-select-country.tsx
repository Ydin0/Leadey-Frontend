"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { mockCountryOptions } from "@/lib/mock-data/calling";
import type { CountryOption } from "@/lib/types/calling";

interface StepSelectCountryProps {
  selected: CountryOption | null;
  onSelect: (country: CountryOption) => void;
}

export function StepSelectCountry({ selected, onSelect }: StepSelectCountryProps) {
  const [search, setSearch] = useState("");

  const filtered = mockCountryOptions.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Select Country</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">Choose the country for your new phone number.</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search countries..."
        className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      />

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((country) => (
          <button
            key={country.code}
            type="button"
            onClick={() => onSelect(country)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-[10px] border text-left transition-colors",
              selected?.code === country.code
                ? "border-signal-blue-text bg-signal-blue"
                : "border-border-subtle bg-section/50 hover:bg-hover"
            )}
          >
            <span className="text-[20px]">{country.flag}</span>
            <div>
              <p className="text-[12px] font-medium text-ink">{country.name}</p>
              <p className="text-[10px] text-ink-muted">
                {country.availableTypes.join(", ")}
                {country.bundleRequired && " \u00b7 bundle required"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[12px] text-ink-muted text-center py-4">No countries match your search.</p>
      )}
    </div>
  );
}
