"use client";

import React from "react";
import { Icon } from "./icon";
import { Sparkline } from "./charts";
import {
  CH_MAP, WINDOWS, initialsOf, type ChannelId, type WindowId, type MemberStatus,
} from "@/lib/team/team-data";

export const POD_COLOR: Record<string, string> = {
  Enterprise: "#97A4D6",
  "Mid-Market": "#86EFAC",
  SMB: "#6E7BCB",
};

export const STATUS_META: Record<string, [string, string]> = {
  active: ["var(--signal-green-text)", "Active"],
  away: ["var(--fg-faint)", "Away"],
  ramping: ["var(--signal-blue-text)", "Ramping"],
};

export function Avatar({ name, size = 32, pod }: { name: string; size?: number; pod?: string }) {
  const col = (pod && POD_COLOR[pod]) || "var(--fg-muted)";
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36,
      background: "var(--section)", color: "var(--fg1)", border: `1.5px solid ${col}55`, position: "relative" }}>
      {initialsOf(name)}
    </div>
  );
}

export function StatusDot({ status }: { status: MemberStatus }) {
  const [col, label] = STATUS_META[status] || STATUS_META.active;
  return (
    <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--fg-muted)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, boxShadow: status === "active" ? `0 0 6px ${col}` : "none" }}></span>
      {label}
    </span>
  );
}

export function WindowSeg({ value, onChange }: { value: WindowId; onChange: (v: WindowId) => void }) {
  return (
    <div className="seg">
      {WINDOWS.map((w) => (
        <button key={w.id} className={"seg-btn" + (value === w.id ? " on" : "")} onClick={() => onChange(w.id)}>{w.short}</button>
      ))}
    </div>
  );
}

export function DeltaPill({ d }: { d: number }) {
  if (!isFinite(d) || Math.abs(d) < 0.005) return <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>—</span>;
  const up = d > 0;
  const col = up ? "var(--signal-green-text)" : "var(--signal-red-text)";
  return (
    <span className="row" style={{ gap: 3, fontSize: 11, fontWeight: 600, color: col }}>
      <Icon name={up ? "trending-up" : "trending-down"} size={12} strokeWidth={2} />
      {Math.abs(Math.round(d * 100))}%
    </span>
  );
}

export function StatCard({ ch, total, delta, spark }: {
  ch: ChannelId; total: number; delta: number; spark: number[];
}) {
  const c = CH_MAP[ch];
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between">
        <div className="row" style={{ gap: 9 }}>
          <div className="row" style={{ width: 30, height: 30, borderRadius: 9, justifyContent: "center", background: c.color + "1f" }}>
            <Icon name={c.icon} size={15} style={{ color: c.color }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{c.label}</span>
        </div>
        <DeltaPill d={delta} />
      </div>
      <div className="between" style={{ marginTop: 12, alignItems: "flex-end" }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>{total.toLocaleString()}</div>
        <Sparkline data={spark} color={c.color} width={104} height={32} />
      </div>
    </div>
  );
}

export function ChannelLegend({ channels }: { channels?: ChannelId[] }) {
  const list = channels || (Object.keys(CH_MAP) as ChannelId[]);
  return (
    <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
      {list.map((ch) => (
        <span key={ch} className="row" style={{ gap: 6, fontSize: 11, color: "var(--fg2)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: CH_MAP[ch].color }}></span>
          {CH_MAP[ch].label}
        </span>
      ))}
    </div>
  );
}

export function Panel({ title, sub, right, children, pad = 18, style }: {
  title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
  pad?: number; style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={{ padding: pad, ...style }}>
      {(title || right) && (
        <div className="between" style={{ marginBottom: 14 }}>
          <div>
            <div className="sec-h" style={{ fontSize: 14 }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
