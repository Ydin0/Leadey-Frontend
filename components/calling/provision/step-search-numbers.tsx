"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableNumber, CountryOption, PhoneLineType } from "@/lib/types/calling";

interface StepSearchNumbersProps {
  country: CountryOption | null;
  type: PhoneLineType | null;
  selected: AvailableNumber | null;
  onSelect: (number: AvailableNumber) => void;
}

export function StepSearchNumbers({ country, type, selected, onSelect }: StepSearchNumbersProps) {
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!country || !type) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        country: country.code,
        type,
      });
      if (areaCode.trim()) {
        params.set("areaCode", areaCode.trim());
      }

      const res = await fetch(`/api/twilio/numbers/search?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        setResults([]);
      } else {
        setResults(
          data.map((n: Record<string, unknown>, i: number) => ({
            id: `an_${i}`,
            number: n.number,
            locality: n.locality || "",
            region: n.region || "",
            country: country.name,
            countryCode: country.code,
            type,
            monthlyCost: type === "toll-free" ? 2.15 : 1.15,
            capabilities: n.capabilities || ["voice"],
          }))
        );
      }
    } catch {
      setError("Network error. Please try again.");
      setResults([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Search Available Numbers</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">Find and select a number to provision.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          placeholder="Area code or prefix (optional)"
          className="flex-1 px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} strokeWidth={2} className="animate-spin" />
          ) : (
            <Search size={13} strokeWidth={2} />
          )}
          Search
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-signal-red-text text-center">{error}</p>
      )}

      {searched && !loading && (
        <div className="space-y-2">
          {results.map((num) => (
            <button
              key={num.number}
              type="button"
              onClick={() => onSelect(num)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-[10px] border text-left transition-colors",
                selected?.number === num.number
                  ? "border-signal-blue-text bg-signal-blue"
                  : "border-border-subtle bg-section/50 hover:bg-hover"
              )}
            >
              <div>
                <p className="text-[13px] font-medium text-ink">{num.number}</p>
                <p className="text-[11px] text-ink-muted">
                  {num.locality}{num.region ? `, ${num.region}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  {num.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-signal-slate text-signal-slate-text uppercase"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-medium text-ink">${num.monthlyCost.toFixed(2)}/mo</span>
              </div>
            </button>
          ))}

          {results.length === 0 && (
            <div className="rounded-[10px] border border-border-subtle bg-section/50 p-6 text-center">
              <p className="text-[12px] text-ink-muted">No numbers found. Try a different area code.</p>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="rounded-[10px] border border-border-subtle bg-section/50 p-6 text-center">
          <p className="text-[12px] text-ink-muted">Click Search to find available numbers.</p>
        </div>
      )}
    </div>
  );
}
