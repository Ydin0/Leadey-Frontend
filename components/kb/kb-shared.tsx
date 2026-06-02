"use client";

import React from "react";
import { Icon } from "@/components/team/icon";
import { TYPES, initials, type Lesson, type Offer } from "@/lib/kb/kb-data";

export function fmtMins(m: number): string {
  if (m >= 60) { const h = Math.floor(m / 60), r = m % 60; return h + "h" + (r ? " " + r + "m" : ""); }
  return m + "m";
}

export function OfferLogo({ offer, size = 44, radius }: {
  offer: { name: string; accent: string }; size?: number; radius?: number;
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius == null ? size * 0.28 : radius, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, letterSpacing: "-0.02em",
      fontSize: size * 0.34, color: offer.accent,
      background: `linear-gradient(155deg, ${offer.accent}2e 0%, ${offer.accent}12 100%)`,
      border: `1px solid ${offer.accent}40` }}>
      {initials(offer.name)}
    </div>
  );
}

export function TypeMedallion({ type, size = 30 }: { type: Lesson["type"]; size?: number }) {
  const meta = TYPES[type] || TYPES.article;
  return (
    <div className="row" style={{ width: size, height: size, borderRadius: size * 0.3, justifyContent: "center", flexShrink: 0, background: meta.color + "1f" }}>
      <Icon name={meta.icon} size={size * 0.5} style={{ color: meta.color }} />
    </div>
  );
}

export function TypeChip({ type }: { type: Lesson["type"] }) {
  const meta = TYPES[type] || TYPES.article;
  return (
    <span className="row" style={{ gap: 5, fontSize: 10, fontWeight: 500, color: meta.color, background: meta.color + "1a", borderRadius: 9999, padding: "3px 9px" }}>
      <Icon name={meta.icon} size={11} />{meta.label}
    </span>
  );
}

export function CatChip({ cat }: { cat: string }) {
  return <span className="badge" style={{ background: "var(--section)", color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 9.5 }}>{cat}</span>;
}

export function Panel({ title, sub, right, children, pad = 18, style, brand }: {
  title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
  pad?: number; style?: React.CSSProperties; brand?: boolean;
}) {
  return (
    <div className={brand ? "card-brand" : "card"} style={{ padding: pad, ...style }}>
      {(title || right) && (
        <div className="between" style={{ marginBottom: 14 }}>
          <div>
            {title && <div className="sec-h" style={{ fontSize: 14 }}>{title}</div>}
            {sub && <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function LessonRow({ lesson, index, done, current, onOpen }: {
  lesson: Lesson; index: number; done: boolean; current?: boolean; onOpen: () => void;
}) {
  return (
    <div className="row click" onClick={onOpen}
      style={{ gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer", background: current ? "var(--hover)" : "transparent", transition: "background .12s" }}
      onMouseEnter={(e) => { if (!current) e.currentTarget.style.background = "var(--section)"; }}
      onMouseLeave={(e) => { if (!current) e.currentTarget.style.background = "transparent"; }}>
      <div className="row" style={{ width: 22, height: 22, borderRadius: "50%", justifyContent: "center", flexShrink: 0,
        background: done ? "var(--signal-green)" : "var(--section)", border: done ? "none" : "1px solid var(--border-default)" }}>
        {done ? <Icon name="check" size={13} style={{ color: "var(--signal-green-text)" }} strokeWidth={2.5} />
              : <span style={{ fontSize: 10, color: "var(--fg-muted)", fontWeight: 600 }}>{index}</span>}
      </div>
      <TypeMedallion type={lesson.type} size={28} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 12.5, fontWeight: 500, color: done ? "var(--fg-muted)" : "var(--fg1)" }}>{lesson.title}</div>
        <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 1 }}>{TYPES[lesson.type].label} · {lesson.dur}</div>
      </div>
      <Icon name="chevron-right" size={15} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
    </div>
  );
}

export type { Lesson, Offer };
