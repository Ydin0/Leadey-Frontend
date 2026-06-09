"use client";

import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
 * Shared presentational primitives for the Cold Email System, ported from the
 * design bundle (email/ui.jsx). Colors use the app's shared design tokens
 * (var(--color-*)) so everything adapts to light/dark automatically.
 * ────────────────────────────────────────────────────────────────────────── */

export type Tone = "slate" | "green" | "red" | "blue";

const TONE_CLASS: Record<Tone, string> = {
  slate: "bg-signal-slate text-signal-slate-text",
  green: "bg-signal-green text-signal-green-text",
  red: "bg-signal-red text-signal-red-text",
  blue: "bg-signal-blue text-signal-blue-text",
};

/** Map domain/campaign/DNS statuses to a tone. Ported from STATUS_TONE. */
export const STATUS_TONE: Record<string, Tone> = {
  active: "green",
  paused: "blue",
  draft: "slate",
  completed: "slate",
  healthy: "green",
  warning: "blue",
  critical: "red",
  pass: "green",
  warn: "blue",
  fail: "red",
};

export function Chip({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  className,
  glow = false,
  size = 7,
}: {
  className?: string;
  glow?: boolean;
  size?: number;
}) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        boxShadow: glow ? "0 0 8px currentColor" : "none",
      }}
    />
  );
}

/** KPI stat card. `tone` controls the icon chip color. */
export function Stat({
  icon: IconCmp,
  label,
  value,
  sub,
  tone = "slate",
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: Tone;
  trend?: number;
}) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex items-center justify-center w-[30px] h-[30px] rounded-lg",
            TONE_CLASS[tone],
          )}
        >
          <IconCmp size={15} strokeWidth={1.6} />
        </span>
        {trend != null && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium",
              trend >= 0 ? "text-signal-green-text" : "text-signal-red-text",
            )}
          >
            {trend >= 0 ? <TrendingUp size={12} strokeWidth={2} /> : <TrendingDown size={12} strokeWidth={2} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-[23px] font-semibold tracking-[-0.02em] text-ink leading-none">
          {value}
        </div>
        <div className="text-[11px] text-ink-muted mt-1">{label}</div>
        {sub && <div className="text-[10px] text-ink-faint mt-1">{sub}</div>}
      </div>
    </div>
  );
}

/** Radial progress ring. Pass color as a CSS color string / token var. */
export function Donut({
  value,
  size = 64,
  stroke = 7,
  color = "var(--color-accent)",
  track = "var(--color-section)",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, value) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      {label !== undefined && (
        <div
          className="absolute inset-0 flex items-center justify-center font-semibold text-ink"
          style={{ fontSize: size * 0.22 }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/** Horizontal progress bar. */
export function Bar({
  value,
  color = "var(--color-accent)",
  height = 6,
  track = "var(--color-section)",
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ height, background: track }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: Math.min(100, Math.max(0, value)) + "%",
          background: color,
          transition: "width .4s ease",
        }}
      />
    </div>
  );
}

/** Toggle switch. */
export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        "w-[38px] h-[22px] rounded-full p-0.5 shrink-0 border transition-colors",
        on ? "bg-accent border-transparent" : "bg-section border-border-default",
      )}
    >
      <span
        className={cn(
          "block w-4 h-4 rounded-full transition-transform",
          on ? "translate-x-4 bg-[#0C1122]" : "translate-x-0 bg-ink-muted",
        )}
      />
    </button>
  );
}

/* ── Number formatting helpers (ported from ui.jsx) ── */
export function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return "" + n;
}

export function pct(n: number | null | undefined): string {
  return (n || 0).toFixed(1) + "%";
}
