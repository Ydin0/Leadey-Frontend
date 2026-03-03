"use client";

import { cn } from "@/lib/utils";
import type { PhoneLineType, CountryOption } from "@/lib/types/calling";

const typeInfo: Record<PhoneLineType, { label: string; description: string; costRange: string }> = {
  local: {
    label: "Local",
    description: "A local number tied to a specific area code. Best for regional presence.",
    costRange: "$1.00 - $1.50/mo",
  },
  "toll-free": {
    label: "Toll-Free",
    description: "A toll-free number (800, 888, etc.). Best for inbound support lines.",
    costRange: "$2.00 - $2.50/mo",
  },
  mobile: {
    label: "Mobile",
    description: "A mobile number with SMS and MMS capabilities. Best for texting campaigns.",
    costRange: "$1.25 - $1.75/mo",
  },
};

interface StepSelectTypeProps {
  country: CountryOption | null;
  selected: PhoneLineType | null;
  onSelect: (type: PhoneLineType) => void;
}

export function StepSelectType({ country, selected, onSelect }: StepSelectTypeProps) {
  const allTypes: PhoneLineType[] = ["local", "toll-free", "mobile"];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Select Number Type</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">Choose the type of number you want to provision.</p>
      </div>

      <div className="space-y-2">
        {allTypes.map((type) => {
          const info = typeInfo[type];
          const isAvailable = country?.availableTypes.includes(type) ?? false;

          return (
            <button
              key={type}
              type="button"
              onClick={() => isAvailable && onSelect(type)}
              disabled={!isAvailable}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-[10px] border text-left transition-colors",
                !isAvailable
                  ? "border-border-subtle bg-section/30 opacity-50 cursor-not-allowed"
                  : selected === type
                    ? "border-signal-blue-text bg-signal-blue"
                    : "border-border-subtle bg-section/50 hover:bg-hover"
              )}
            >
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">{info.label}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{info.description}</p>
                {!isAvailable && country && (
                  <p className="text-[10px] text-signal-red-text mt-1">
                    Not available in {country.name}
                  </p>
                )}
              </div>
              <span className="text-[11px] text-ink-faint shrink-0">{info.costRange}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
