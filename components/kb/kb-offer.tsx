"use client";

import { Icon } from "@/components/team/icon";
import { Ring, Meter, attColor } from "@/components/team/charts";
import { OfferLogo, Panel, CatChip, LessonRow, fmtMins } from "./kb-shared";
import { OFFER_MAP, lessonsOf, offerStats, offerProgress, progress } from "@/lib/kb/kb-data";
import type { Lesson, Offer } from "@/lib/types/kb";

export function KBOffer({
  offerId, manage, onOpenLesson, onAddModule, onAddLesson,
  onEditOffer, onDeleteOffer, onAssign, onEditModule, onDeleteModule, onEditLesson, onDeleteLesson,
}: {
  offerId: string;
  manage: boolean;
  onOpenLesson: (id: string) => void;
  onAddModule: (offerId: string) => void;
  onAddLesson: (offerId: string, moduleId: string) => void;
  onEditOffer: (offer: Offer) => void;
  onDeleteOffer: (offerId: string) => void;
  onAssign: (offer: Offer) => void;
  onEditModule: (moduleId: string, title: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onEditLesson: (offerId: string, moduleId: string, lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
}) {
  const o = OFFER_MAP[offerId];
  if (!o) return null;
  const st = offerStats(o);
  const pr = offerProgress(o);
  const flat = lessonsOf(o);
  const resume = flat.find((l) => !progress.isDone(l.id)) || flat[0];

  let counter = 0;

  const iconBtn = (name: string, onClick: () => void, color?: string) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="row"
      style={{ width: 28, height: 28, borderRadius: 7, justifyContent: "center", background: "var(--section)", color: color || "var(--fg-muted)" }}
    >
      <Icon name={name} size={13} />
    </button>
  );

  return (
    <div className="fade" style={{ display: "grid", gap: 18 }}>
      {/* Hero */}
      <div className="card-brand" style={{ padding: 26, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 240, height: 240, borderRadius: "50%",
          background: `radial-gradient(circle, ${o.accent}24 0%, rgba(0,0,0,0) 70%)`, pointerEvents: "none" }}></div>
        <div className="between" style={{ alignItems: "flex-start", position: "relative" }}>
          <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
            <OfferLogo offer={o} size={62} />
            <div>
              <div className="row" style={{ gap: 8 }}>
                {o.core ? <span className="badge" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Required</span> : <CatChip cat={o.category} />}
                <span style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>{o.level}</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 8 }}>{o.name}</h1>
              <p style={{ fontSize: 13, color: "var(--fg2)", marginTop: 6, maxWidth: 540, lineHeight: 1.55 }}>{o.tagline}</p>
              <div className="row" style={{ gap: 18, marginTop: 14, fontSize: 12, color: "var(--fg-muted)" }}>
                <span className="row" style={{ gap: 6 }}><Icon name="layers" size={14} />{st.modules} modules</span>
                <span className="row" style={{ gap: 6 }}><Icon name="book-open" size={14} />{st.lessons} lessons</span>
                <span className="row" style={{ gap: 6 }}><Icon name="clock" size={14} />{fmtMins(st.mins)}</span>
              </div>
              <div className="row" style={{ gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                {flat.length > 0 && (
                  <button className="pill pill-primary" onClick={() => onOpenLesson(resume.id)}>
                    <Icon name="play" size={13} />{pr.done > 0 ? "Continue learning" : "Start learning"}
                  </button>
                )}
                {manage && <button className="pill pill-soft" onClick={() => onAssign(o)}><Icon name="user-plus" size={13} />Assign members</button>}
                {manage && <button className="pill pill-soft" onClick={() => onAddModule(o.id)}><Icon name="plus" size={13} />Add module</button>}
                {manage && <button className="pill pill-soft" onClick={() => onEditOffer(o)}><Icon name="pencil" size={13} />Edit</button>}
                {manage && <button className="pill pill-soft" onClick={() => onDeleteOffer(o.id)} style={{ color: "var(--signal-red-text)" }}><Icon name="trash-2" size={13} />Delete</button>}
              </div>
            </div>
          </div>
          <div className="col" style={{ alignItems: "center", gap: 4 }}>
            <Ring pct={pr.pct} size={84} thickness={9} color={pr.pct >= 1 ? "var(--signal-green-text)" : o.accent} />
            <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{pr.done}/{pr.total} done</span>
          </div>
        </div>
      </div>

      {/* Outline + rail */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18, alignItems: "start" }}>
        <div className="col" style={{ gap: 14 }}>
          {o.modules.map((m, mi) => {
            const mdone = progress.countDone(m.lessons.map((l) => l.id));
            return (
              <div key={m.id} className="card" style={{ padding: 8 }}>
                <div className="between" style={{ padding: "10px 12px 8px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="eyebrow">Module {mi + 1}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</span>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{mdone}/{m.lessons.length}</span>
                    {manage && iconBtn("pencil", () => onEditModule(m.id, m.title))}
                    {manage && iconBtn("trash-2", () => onDeleteModule(m.id), "var(--signal-red-text)")}
                  </div>
                </div>
                <div className="col" style={{ gap: 1 }}>
                  {m.lessons.map((l) => {
                    counter++;
                    if (!manage) {
                      return <LessonRow key={l.id} lesson={l} index={counter} done={progress.isDone(l.id)} onOpen={() => onOpenLesson(l.id)} />;
                    }
                    return (
                      <div key={l.id} className="row" style={{ gap: 6 }}>
                        <div className="grow"><LessonRow lesson={l} index={counter} done={progress.isDone(l.id)} onOpen={() => onOpenLesson(l.id)} /></div>
                        {iconBtn("pencil", () => onEditLesson(o.id, m.id, l))}
                        {iconBtn("trash-2", () => onDeleteLesson(l.id), "var(--signal-red-text)")}
                      </div>
                    );
                  })}
                  {!m.lessons.length && <div style={{ padding: "12px", fontSize: 11.5, color: "var(--fg-faint)", textAlign: "center" }}>No lessons yet.</div>}
                  {manage && (
                    <button className="row" onClick={() => onAddLesson(o.id, m.id)} style={{ gap: 8, padding: "10px 12px", color: "var(--fg-muted)", fontSize: 12, borderRadius: 8, border: "1px dashed var(--border-default)", margin: "4px 8px 6px", justifyContent: "center" }}>
                      <Icon name="plus" size={13} />Add lesson
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!o.modules.length && <div className="card" style={{ padding: 20, fontSize: 12, color: "var(--fg-muted)", textAlign: "center" }}>No modules yet.</div>}
          {manage && (
            <button className="row" onClick={() => onAddModule(o.id)} style={{ gap: 8, padding: 14, color: "var(--fg-muted)", fontSize: 12.5, borderRadius: 12, border: "1px dashed var(--border-default)", justifyContent: "center" }}>
              <Icon name="plus" size={14} />Add another module
            </button>
          )}
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Panel title="About this offer">
            <p style={{ fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.6 }}>{o.about || "No description yet."}</p>
          </Panel>
          <Panel title="Your progress">
            <div style={{ marginBottom: 10 }}><Meter pct={pr.pct} color={pr.pct >= 1 ? "var(--signal-green-text)" : o.accent} /></div>
            <div className="between" style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              <span>{pr.done} of {pr.total} lessons</span>
              <span style={{ fontWeight: 600, color: attColor(pr.pct) }}>{Math.round(pr.pct * 100)}%</span>
            </div>
            {pr.pct >= 1 && pr.total > 0 && (
              <div className="row" style={{ gap: 8, marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "var(--signal-green)", color: "var(--signal-green-text)", fontSize: 12, fontWeight: 500 }}>
                <Icon name="award" size={15} />Offer certified — cleared to dial
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
