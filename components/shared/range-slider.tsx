"use client";

import { cn } from "@/lib/utils";

interface RangeSliderProps {
  label?: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  formatValue?: (value: number) => string;
}

export function RangeSlider({ label, min, max, value, onChange, step = 1, formatValue }: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{label}</label>
          <span className="text-[13px] font-medium text-ink">{formatValue ? formatValue(value) : value}</span>
        </div>
      )}
      <div className="relative">
        <div className="h-[3px] rounded bg-section">
          <div className="h-full rounded bg-signal-blue-text" style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-signal-blue-text pointer-events-none"
          style={{ left: `calc(${percentage}% - 7px)` }}
        />
      </div>
    </div>
  );
}

interface RangePreset {
  label: string;
  min: number;
  max: number;
}

interface RangeWithPresetsProps {
  label?: string;
  presets: RangePreset[];
  selectedMin: number;
  selectedMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}

export function RangeWithPresets({ label, presets, selectedMin, selectedMax, onChangeMin, onChangeMax }: RangeWithPresetsProps) {
  function isPresetSelected(preset: RangePreset) {
    return selectedMin === preset.min && selectedMax === preset.max;
  }

  return (
    <div>
      {label && <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">{label}</label>}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => { onChangeMin(preset.min); onChangeMax(preset.max); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border",
              isPresetSelected(preset)
                ? "bg-signal-blue text-signal-blue-text border-signal-blue-text/20"
                : "bg-surface text-ink-secondary border-border-subtle hover:bg-hover"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-ink-faint mb-1 block">Min</label>
          <input
            type="number"
            value={selectedMin}
            onChange={(e) => onChangeMin(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
          />
        </div>
        <span className="text-ink-faint mt-4">&ndash;</span>
        <div className="flex-1">
          <label className="text-[10px] text-ink-faint mb-1 block">Max</label>
          <input
            type="number"
            value={selectedMax}
            onChange={(e) => onChangeMax(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
          />
        </div>
      </div>
    </div>
  );
}
