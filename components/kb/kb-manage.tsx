"use client";

import React from "react";
import { Icon } from "@/components/team/icon";
import { OfferLogo } from "./kb-shared";
import { TYPES, type LessonType } from "@/lib/kb/kb-data";

const KB_ACCENTS = ["#97A4D6", "#6E7BCB", "#86EFAC", "#C8CFE6", "#E8C45C", "#F8A1A1"];
const KB_CATS = ["SaaS", "Coaching", "Agency", "Fintech", "E-commerce", "Onboarding"];

function ModalShell({ icon, title, sub, onClose, children, footer, width = 540 }: {
  icon: string; title: string; sub: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode; width?: number;
}) {
  return (
    <div className="team-scrim team-root" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="row" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--section)", justifyContent: "center" }}><Icon name={icon} size={16} style={{ color: "var(--accent)" }} /></div>
            <div><div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{sub}</div></div>
          </div>
          <button onClick={onClose} className="row" style={{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", color: "var(--fg-muted)" }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16 }}>{children}</div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--border-subtle)" }}>{footer}</div>
      </div>
    </div>
  );
}

export function OfferModal({ onClose, onSave }: {
  onClose: () => void; onSave: (data: { name: string; tagline: string; category: string; level: string; accent: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [cat, setCat] = React.useState("SaaS");
  const [level, setLevel] = React.useState("New");
  const [accent, setAccent] = React.useState("#97A4D6");
  const valid = name.trim().length > 1;
  const preview = { name: name || "New Offer", accent };
  return (
    <ModalShell icon="folder-plus" title="Create offer" sub="A client company or product your reps will sell" onClose={onClose}
      footer={<>
        <button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <button className="pill pill-primary" style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? "auto" : "none" }} onClick={() => onSave({ name: name.trim(), tagline, category: cat, level, accent })}><Icon name="check" size={13} />Create offer</button>
      </>}>
      <div className="row" style={{ gap: 14, alignItems: "center", padding: "4px 0" }}>
        <OfferLogo offer={preview} size={52} />
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Accent</div>
        <div className="row" style={{ gap: 8 }}>
          {KB_ACCENTS.map((c) => (
            <button key={c} onClick={() => setAccent(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: accent === c ? "2px solid var(--fg1)" : "2px solid transparent", outline: "1px solid var(--border-default)" }}></button>
          ))}
        </div>
      </div>
      <div><label className="lbl">Offer name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Analytics" autoFocus /></div>
      <div><label className="lbl">Tagline</label><input className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What it is, in one line." /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><label className="lbl">Category</label><select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>{KB_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="lbl">Level</label><select className="field" value={level} onChange={(e) => setLevel(e.target.value)}>{["New", "Core offer", "Required"].map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
    </ModalShell>
  );
}

export function ModuleModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = React.useState("");
  const valid = title.trim().length > 1;
  return (
    <ModalShell icon="layers" title="Add module" sub="A group of lessons within this offer" onClose={onClose} width={460}
      footer={<>
        <button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <button className="pill pill-primary" style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? "auto" : "none" }} onClick={() => onSave(title.trim())}><Icon name="check" size={13} />Add module</button>
      </>}>
      <div><label className="lbl">Module title</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Know the product" autoFocus /></div>
    </ModalShell>
  );
}

export function LessonModal({ onClose, onSave }: {
  onClose: () => void; onSave: (data: { title: string; type: LessonType; loom: string; dur: string; summary: string }) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<LessonType>("video");
  const [loom, setLoom] = React.useState("");
  const [dur, setDur] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const valid = title.trim().length > 1;
  const typeKeys = Object.keys(TYPES) as LessonType[];
  const loomOk = /loom\.com\//i.test(loom);

  return (
    <ModalShell icon="file-plus-2" title="Add lesson" sub="Video, article, script, resource, FAQ or quiz" onClose={onClose}
      footer={<>
        <button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <button className="pill pill-primary" style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? "auto" : "none" }}
          onClick={() => onSave({ title: title.trim(), type, loom, dur: dur || (type === "video" ? "0:00" : TYPES[type].label), summary })}><Icon name="check" size={13} />Add lesson</button>
      </>}>
      <div><label className="lbl">Lesson title</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Live demo walkthrough" autoFocus /></div>
      <div>
        <label className="lbl">Type</label>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {typeKeys.map((tk) => {
            const meta = TYPES[tk]; const on = type === tk;
            return (
              <button key={tk} onClick={() => setType(tk)} className="row" style={{ gap: 6, fontSize: 12, padding: "7px 12px", borderRadius: 9999,
                border: "1px solid " + (on ? meta.color : "var(--border-default)"), background: on ? meta.color + "1f" : "transparent", color: on ? meta.color : "var(--fg-muted)" }}>
                <Icon name={meta.icon} size={13} />{meta.label}
              </button>
            );
          })}
        </div>
      </div>
      {type === "video" && (
        <div>
          <label className="lbl">Loom share link</label>
          <div className="row" style={{ gap: 8, background: "var(--page)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "2px 2px 2px 12px" }}>
            <Icon name="link" size={14} style={{ color: "var(--fg-muted)" }} />
            <input style={{ flex: 1, background: "transparent", border: 0, color: "var(--fg1)", fontSize: 13, padding: "8px 0", outline: "none" }} value={loom} onChange={(e) => setLoom(e.target.value)} placeholder="https://www.loom.com/share/…" />
          </div>
          {loom && (
            <div className="row" style={{ gap: 10, marginTop: 10, padding: 10, borderRadius: 10, background: "var(--page)", border: "1px solid var(--border-subtle)" }}>
              <div className="row" style={{ width: 64, height: 38, borderRadius: 6, justifyContent: "center", background: "linear-gradient(150deg,#141A30,#0A0E1F)", border: "1px solid var(--border-subtle)" }}>
                <Icon name={loomOk ? "play-circle" : "alert-triangle"} size={16} style={{ color: loomOk ? "var(--accent)" : "var(--signal-red-text)" }} />
              </div>
              <span style={{ fontSize: 11.5, color: loomOk ? "var(--fg2)" : "var(--signal-red-text)" }}>{loomOk ? "Loom embed detected — preview ready." : "Paste a valid loom.com share link."}</span>
            </div>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
        <div><label className="lbl">Duration</label><input className="field" value={dur} onChange={(e) => setDur(e.target.value)} placeholder={type === "video" ? "8:24" : "5 min read"} /></div>
        <div><label className="lbl">Summary</label><input className="field" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line on what this covers." /></div>
      </div>
    </ModalShell>
  );
}
