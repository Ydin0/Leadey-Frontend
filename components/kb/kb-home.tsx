"use client";

import { Icon } from "@/components/team/icon";
import { Ring, Meter, attColor } from "@/components/team/charts";
import { OfferLogo, Panel, CatChip, fmtMins } from "./kb-shared";
import {
  OFFERS, OFFER_MAP, lessonsOf, allLessons, lessonById, offerStats, offerProgress, progress,
} from "@/lib/kb/kb-data";

export function KBHome({ onOpenOffer, onOpenLesson, onManage, canManage, onNewOffer, perRow = 3 }: {
  onOpenOffer: (id: string) => void;
  onOpenLesson: (id: string) => void;
  onManage: () => void;
  canManage: boolean;
  onNewOffer: () => void;
  perRow?: number;
}) {
  // Empty state — nothing to learn yet.
  if (OFFERS.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center", display: "grid", gap: 14, justifyItems: "center" }}>
        <div className="row" style={{ width: 56, height: 56, borderRadius: 14, justifyContent: "center", background: "var(--section)" }}>
          <Icon name="graduation-cap" size={24} style={{ color: "var(--fg-muted)" }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{canManage ? "Build your knowledge base" : "No offers assigned yet"}</div>
          <p style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 6, maxWidth: 420 }}>
            {canManage
              ? "Create an offer, add modules and lessons, then assign it to the reps who need to learn it."
              : "Your admin hasn't assigned any offers to you yet. Once they do, they'll appear here."}
          </p>
        </div>
        {canManage && (
          <button className="pill pill-primary" onClick={onNewOffer}><Icon name="folder-plus" size={13} />Create your first offer</button>
        )}
      </div>
    );
  }

  const last = lessonById(progress.last()) || allLessons()[0];
  const lastOffer = last ? OFFER_MAP[last.offerId!] : null;

  // The learning "path" is the core/onboarding offer's lessons, else the first offer's.
  const pathOffer = OFFERS.find((o) => o.core) || OFFERS[0];
  const pathLessons = pathOffer ? lessonsOf(pathOffer) : [];
  const pathIds = pathLessons.map((l) => l.id);
  const pathDone = progress.countDone(pathIds);
  const pathPct = pathIds.length ? pathDone / pathIds.length : 0;

  const totalLessons = allLessons().length;
  const totalDone = progress.countDone(allLessons().map((l) => l.id));

  return (
    <div className="fade" style={{ display: "grid", gap: 18 }}>
      {/* Continue learning hero */}
      {last && lastOffer && (
        <div className="card-brand" style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "1.5fr 1fr" }}>
          <div style={{ padding: 26 }}>
            <span className="eyebrow">Continue where you left off</span>
            <div className="row" style={{ gap: 14, marginTop: 14 }}>
              <OfferLogo offer={lastOffer} size={46} />
              <div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{lastOffer.name} · {last.moduleTitle}</div>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2 }}>{last.title}</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--fg2)", marginTop: 12, maxWidth: 460 }}>{last.summary}</p>
            <div className="row" style={{ gap: 10, marginTop: 18 }}>
              <button className="pill pill-primary" onClick={() => onOpenLesson(last.id)}><Icon name="play" size={13} />Resume lesson</button>
              <button className="pill pill-soft" onClick={() => onOpenOffer(lastOffer.id)}>View offer</button>
            </div>
          </div>
          <div style={{ position: "relative", background: `linear-gradient(135deg, ${lastOffer.accent}26 0%, rgba(20,26,48,0) 70%)`, borderLeft: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={() => onOpenLesson(last.id)} className="row" style={{ cursor: "pointer", width: 64, height: 64, borderRadius: "50%", justifyContent: "center",
              background: "rgba(255,255,255,0.92)", boxShadow: "0 12px 36px -8px rgba(0,0,0,0.5)" }}>
              <Icon name="play" size={24} style={{ color: "#0C1122", marginLeft: 3 }} strokeWidth={2} />
            </div>
          </div>
        </div>
      )}

      {/* Learning path + stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <Panel title={pathOffer?.core ? "Onboarding path" : `${pathOffer?.name ?? "Learning"} path`} sub={`${pathDone} of ${pathIds.length} lessons complete`}
          right={<span style={{ fontSize: 13, fontWeight: 600, color: attColor(pathPct) }}>{Math.round(pathPct * 100)}%</span>}>
          <div style={{ marginBottom: 16 }}><Meter pct={pathPct} /></div>
          <div className="col" style={{ gap: 2 }}>
            {pathLessons.length === 0 && <div style={{ padding: 12, fontSize: 11.5, color: "var(--fg-faint)", textAlign: "center" }}>No lessons here yet.</div>}
            {pathLessons.map((l, i) => {
              const done = progress.isDone(l.id);
              const isNext = !done && progress.countDone(pathIds.slice(0, i)) === i;
              return (
                <div key={l.id} className="row click" onClick={() => onOpenLesson(l.id)}
                  style={{ gap: 12, padding: "9px 8px", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--section)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <div className="row" style={{ width: 22, height: 22, borderRadius: "50%", justifyContent: "center", flexShrink: 0,
                    background: done ? "var(--signal-green)" : isNext ? "var(--accent)" : "var(--section)" }}>
                    {done ? <Icon name="check" size={12} style={{ color: "var(--signal-green-text)" }} strokeWidth={2.5} />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: isNext ? "var(--on-accent)" : "var(--fg-muted)" }}>{i + 1}</span>}
                  </div>
                  <span className="grow truncate" style={{ fontSize: 12.5, color: done ? "var(--fg-muted)" : "var(--fg1)" }}>{l.title}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{l.moduleTitle}</span>
                  {isNext && <span className="badge" style={{ background: "var(--signal-blue)", color: "var(--signal-blue-text)" }}>Up next</span>}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Your progress">
          <div className="row" style={{ gap: 16, alignItems: "center" }}>
            <Ring pct={totalLessons ? totalDone / totalLessons : 0} size={92} thickness={9} color="var(--accent)" />
            <div className="col" style={{ gap: 12 }}>
              <div><div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{totalDone}<span style={{ fontSize: 14, color: "var(--fg-faint)", fontWeight: 400 }}> / {totalLessons}</span></div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 3 }}>lessons completed</div></div>
              <div className="row" style={{ gap: 7, fontSize: 11, color: "var(--fg2)" }}>
                <Icon name="layers" size={13} style={{ color: "var(--fg-muted)" }} />{OFFERS.length} {OFFERS.length === 1 ? "offer" : "offers"} {canManage ? "in library" : "assigned"}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Offers grid */}
      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <div className="sec-h">Offers &amp; playbooks</div>
          {canManage && <button className="pill pill-soft" onClick={onManage}><Icon name="settings-2" size={13} />Manage library</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${perRow},1fr)`, gap: 16 }}>
          {OFFERS.map((o) => {
            const st = offerStats(o); const pr = offerProgress(o);
            return (
              <div key={o.id} className="card click" onClick={() => onOpenOffer(o.id)}
                style={{ padding: 18, cursor: "pointer", transition: "transform .15s, border-color .15s", borderColor: "var(--border-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}>
                <div className="between">
                  <OfferLogo offer={o} size={46} />
                  {o.core ? <span className="badge" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Required</span> : <CatChip cat={o.category} />}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>{o.name}</div>
                <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.5, minHeight: 36 }}>{o.tagline}</p>
                <div className="row" style={{ gap: 14, marginTop: 12, fontSize: 11, color: "var(--fg-faint)" }}>
                  <span className="row" style={{ gap: 5 }}><Icon name="book-open" size={12} />{st.lessons} lessons</span>
                  <span className="row" style={{ gap: 5 }}><Icon name="clock" size={12} />{fmtMins(st.mins)}</span>
                </div>
                <div className="row" style={{ gap: 10, marginTop: 14 }}>
                  <div className="grow"><Meter pct={pr.pct} color={pr.pct >= 1 ? "var(--signal-green-text)" : o.accent} /></div>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>{pr.done}/{pr.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
