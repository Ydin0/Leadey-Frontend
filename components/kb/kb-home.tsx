"use client";

import { Icon } from "@/components/team/icon";
import { Ring, Meter, attColor } from "@/components/team/charts";
import { OfferLogo, Panel, CatChip, fmtMins } from "./kb-shared";
import {
  OFFERS, OFFER_MAP, PATH, allLessons, lessonById, offerStats, offerProgress, progress,
} from "@/lib/kb/kb-data";

export function KBHome({ onOpenOffer, onOpenLesson, onManage, perRow = 3 }: {
  onOpenOffer: (id: string) => void; onOpenLesson: (id: string) => void; onManage: () => void; perRow?: number;
}) {
  const last = lessonById(progress.last()) || allLessons()[0];
  const lastOffer = OFFER_MAP[last.offerId!];

  const pathDone = progress.countDone(PATH);
  const pathPct = pathDone / PATH.length;
  const totalLessons = allLessons().length;
  const totalDone = progress.countDone(allLessons().map((l) => l.id));

  return (
    <div className="fade" style={{ display: "grid", gap: 18 }}>
      {/* Continue learning hero */}
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

      {/* Onboarding path + stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <Panel title="New-rep onboarding path" sub={`${pathDone} of ${PATH.length} steps complete`}
          right={<span style={{ fontSize: 13, fontWeight: 600, color: attColor(pathPct) }}>{Math.round(pathPct * 100)}%</span>}>
          <div style={{ marginBottom: 16 }}><Meter pct={pathPct} /></div>
          <div className="col" style={{ gap: 2 }}>
            {PATH.map((id, i) => {
              const l = lessonById(id);
              if (!l) return null;
              const done = progress.isDone(id);
              const isNext = !done && progress.countDone(PATH.slice(0, i)) === i;
              return (
                <div key={id} className="row click" onClick={() => onOpenLesson(id)}
                  style={{ gap: 12, padding: "9px 8px", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--section)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <div className="row" style={{ width: 22, height: 22, borderRadius: "50%", justifyContent: "center", flexShrink: 0,
                    background: done ? "var(--signal-green)" : isNext ? "var(--accent)" : "var(--section)" }}>
                    {done ? <Icon name="check" size={12} style={{ color: "var(--signal-green-text)" }} strokeWidth={2.5} />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: isNext ? "var(--on-accent)" : "var(--fg-muted)" }}>{i + 1}</span>}
                  </div>
                  <span className="grow truncate" style={{ fontSize: 12.5, color: done ? "var(--fg-muted)" : "var(--fg1)" }}>{l.title}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{OFFER_MAP[l.offerId!].name}</span>
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
                <Icon name="layers" size={13} style={{ color: "var(--fg-muted)" }} />{OFFERS.length} offers available
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Offers grid */}
      <div>
        <div className="between" style={{ marginBottom: 14 }}>
          <div className="sec-h">Offers &amp; playbooks</div>
          <button className="pill pill-soft" onClick={onManage}><Icon name="settings-2" size={13} />Manage library</button>
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
