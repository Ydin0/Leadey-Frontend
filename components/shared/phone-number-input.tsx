"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNTRIES, COUNTRIES_ORDERED, DEFAULT_COUNTRY, flagEmoji, type DialCountry,
} from "@/lib/constants/countries";

interface PhoneNumberInputProps {
  label?: string;
  /** Current E.164 value (e.g. "+447893952310"), or "". */
  value: string;
  /** Emits the composed E.164 value ("" when the national number is empty). */
  onChange: (e164: string) => void;
  error?: string;
  placeholder?: string;
  /** ISO-2 default country when value has no dial code yet (defaults to GB). */
  defaultCountry?: string;
}

/** Split a stored E.164 value into a country + national number. Longest
 *  matching dial code wins (so +1 vs +44 etc. resolve correctly). */
function splitE164(value: string, fallback: DialCountry): { country: DialCountry; national: string } {
  if (value && value.startsWith("+")) {
    const match = [...COUNTRIES]
      .filter((c) => value.startsWith(c.dial))
      .sort((a, b) => b.dial.length - a.dial.length)[0];
    if (match) return { country: match, national: value.slice(match.dial.length) };
  }
  return { country: fallback, national: "" };
}

/** Country-code dropdown + national-number input that emits an E.164 string.
 *  Used at sign-up and in profile settings. */
export function PhoneNumberInput({
  label, value, onChange, error, placeholder = "Phone number", defaultCountry,
}: PhoneNumberInputProps) {
  const fallback = useMemo(
    () => COUNTRIES.find((c) => c.code === defaultCountry) || DEFAULT_COUNTRY,
    [defaultCountry],
  );
  // Split the incoming E.164 once for the initial state (lazy init).
  const [initial] = useState(() => splitE164(value, fallback));
  const [country, setCountry] = useState<DialCountry>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function emit(next: DialCountry, nat: string) {
    const digits = nat.replace(/[^\d]/g, "").replace(/^0+/, "");
    onChange(digits ? `${next.dial}${digits}` : "");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES_ORDERED;
    return COUNTRIES_ORDERED.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div>
      {label && (
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">{label}</label>
      )}
      <div ref={ref} className="relative">
        <div className={cn(
          "flex items-stretch rounded-[10px] bg-section border border-border-subtle focus-within:border-accent/50 transition-colors overflow-hidden",
          error && "border-signal-red-text/50",
        )}>
          {/* Country selector */}
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); setSearch(""); }}
            className="flex items-center gap-1.5 pl-3 pr-2 border-r border-border-subtle text-[13px] text-ink hover:bg-hover/40 transition-colors shrink-0"
          >
            <span className="text-[15px] leading-none">{flagEmoji(country.code)}</span>
            <span className="text-ink-secondary tabular-nums">{country.dial}</span>
            <ChevronDown size={13} className="text-ink-muted" />
          </button>
          {/* National number */}
          <input
            type="tel"
            inputMode="tel"
            value={national}
            onChange={(e) => { setNational(e.target.value); emit(country, e.target.value); }}
            placeholder={placeholder}
            className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1.5 w-full max-w-[320px] bg-surface border border-border-default rounded-[12px] shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
              <Search size={13} className="text-ink-muted shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code…"
                className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto py-1">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountry(c); setOpen(false); emit(c, national); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover/50 transition-colors"
                >
                  <span className="text-[15px] leading-none shrink-0">{flagEmoji(c.code)}</span>
                  <span className="flex-1 min-w-0 text-[12.5px] text-ink truncate">{c.name}</span>
                  <span className="text-[11.5px] text-ink-muted tabular-nums shrink-0">{c.dial}</span>
                  {c.code === country.code && <Check size={13} className="text-accent shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-[12px] text-ink-muted text-center py-4">No match</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-signal-red-text mt-1">{error}</p>}
    </div>
  );
}
