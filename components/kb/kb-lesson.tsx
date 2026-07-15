"use client";

import React from "react";
import { Icon } from "@/components/team/icon";
import { LeadeyMark } from "@/components/brand/leadey-mark";
import { TypeChip, Panel, LessonRow } from "./kb-shared";
import {
  OFFER_MAP, lessonById, lessonsOf, offerProgress, nextLesson, prevLesson, progress,
  type Lesson,
} from "@/lib/kb/kb-data";
import type { LinkItem } from "@/lib/types/kb";
import { kbFileObjectUrl } from "@/lib/api/kb";

/* ── Real video embed (Loom / YouTube / Vimeo) ─────────────────────────── */
function videoEmbedUrl(raw?: string): string | null {
  if (!raw) return null;
  const url = raw.trim();
  let m = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (m) return `https://www.loom.com/embed/${m[1]}`;
  m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  if (/^[a-zA-Z0-9]{20,}$/.test(url)) return `https://www.loom.com/embed/${url}`;
  return null;
}

function VideoEmbed({ lesson }: { lesson: Lesson }) {
  const src = videoEmbedUrl(lesson.loom);
  if (!src) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        {lesson.loom ? (
          <a href={lesson.loom} target="_blank" rel="noopener noreferrer" className="pill pill-primary" style={{ display: "inline-flex" }}>
            <Icon name="external-link" size={13} />Open video
          </a>
        ) : (
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>No video link added.</span>
        )}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)", background: "#000" }}>
      <iframe
        src={src}
        title={lesson.title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}

function ArticleBody({ lesson }: { lesson: Lesson }) {
  return (
    <div className="card" style={{ padding: 26 }}>
      <p style={{ fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.7, marginBottom: 18 }}>{lesson.summary}</p>
      {(lesson.body || []).map((b, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg1)", marginBottom: 5 }}>{b.h}</div>
          <p style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.65 }}>{b.p}</p>
        </div>
      ))}
    </div>
  );
}

function ScriptView({ lesson }: { lesson: Lesson }) {
  const s = lesson.script;
  if (!s) return null;
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card-brand" style={{ padding: 22 }}>
        <span className="eyebrow">Opening hook</span>
        <p style={{ fontSize: 15, color: "var(--fg1)", lineHeight: 1.6, marginTop: 10, fontWeight: 500 }}>&ldquo;{s.hook}&rdquo;</p>
      </div>
      {s.points && (
        <Panel title="Talking points">
          <div className="col" style={{ gap: 10 }}>
            {s.points.map((p, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", marginTop: 3, display: "inline-flex" }}><LeadeyMark size={11} /></span>
                <span style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.55 }}>{p}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {s.objections && (
        <Panel title="Objection handlers">
          <div className="col" style={{ gap: 12 }}>
            {s.objections.map((ob, i) => (
              <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--page)", border: "1px solid var(--border-subtle)" }}>
                <div className="row" style={{ gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--signal-red-text)" }}><Icon name="shield-alert" size={14} />{ob.o}</div>
                <p style={{ fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.6, marginTop: 7 }}>{ob.a}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function fileKind(f: LinkItem): "pdf" | "image" | "other" {
  const s = `${f.type || ""} ${f.url || ""} ${f.name || ""}`.toLowerCase();
  if (s.includes("pdf")) return "pdf";
  if (/image\/|\.(png|jpe?g|gif|webp|svg)(\?|$|\s)/.test(s)) return "image";
  return "other";
}

/** One lesson file: header row (name + Open) plus an inline preview — PDFs
 *  render in an embedded viewer, images inline. Uploaded files (with `key`)
 *  are fetched with the auth token as a blob; external links use their URL. */
function LessonFile({ f }: { f: LinkItem }) {
  const uploaded = !!f.key;
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    if (!uploaded) return;
    let dead = false;
    let made: string | null = null;
    kbFileObjectUrl(f.url)
      .then((u) => { if (dead) { URL.revokeObjectURL(u); return; } made = u; setBlobUrl(u); })
      .catch(() => setErr(true));
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [f.url, uploaded]);

  const viewUrl = uploaded ? blobUrl : f.url;
  const kind = fileKind(f);
  const loadingUpload = uploaded && !blobUrl && !err;

  return (
    <div style={{ borderRadius: 12, background: "var(--page)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
      <div className="between" style={{ padding: "12px 14px" }}>
        <div className="row" style={{ gap: 12, minWidth: 0 }}>
          <div className="row" style={{ width: 36, height: 36, borderRadius: 8, justifyContent: "center", background: "var(--section)", flexShrink: 0 }}><Icon name="file-text" size={16} style={{ color: "var(--fg-muted)" }} /></div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>{f.type && <div style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{f.type}</div>}</div>
        </div>
        {viewUrl && <a className="pill pill-soft" href={viewUrl} target="_blank" rel="noopener noreferrer"><Icon name="external-link" size={13} />Open</a>}
      </div>
      {err ? (
        <div style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--signal-red-text)" }}>Couldn&apos;t load this file.</div>
      ) : loadingUpload ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 11.5, color: "var(--fg-faint)" }}>Loading preview…</div>
      ) : kind === "pdf" && viewUrl ? (
        <iframe src={viewUrl} title={f.name} style={{ width: "100%", height: 620, border: 0, borderTop: "1px solid var(--border-subtle)", background: "#fff" }} />
      ) : kind === "image" && viewUrl ? (
        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--section)", textAlign: "center", padding: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewUrl} alt={f.name} style={{ maxWidth: "100%", maxHeight: 620, borderRadius: 8 }} />
        </div>
      ) : null}
    </div>
  );
}

function FileView({ lesson }: { lesson: Lesson }) {
  const files = lesson.files || [];
  return (
    <Panel title="Files">
      <div className="col" style={{ gap: 12 }}>
        {files.length === 0 && <div style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>No files added.</div>}
        {files.map((f, i) => <LessonFile key={i} f={f} />)}
      </div>
    </Panel>
  );
}

function FaqView({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = React.useState(0);
  return (
    <Panel title="Frequently asked">
      <div className="col" style={{ gap: 8 }}>
        {(lesson.items || []).map((it, i) => (
          <div key={i} style={{ borderRadius: 10, background: "var(--page)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
            <button className="between" onClick={() => setOpen(open === i ? -1 : i)} style={{ width: "100%", padding: "13px 14px", textAlign: "left" }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg1)" }}>{it.q}</span>
              <Icon name="chevron-down" size={15} style={{ color: "var(--fg-muted)", transform: open === i ? "rotate(180deg)" : "none", transition: ".2s", flexShrink: 0 }} />
            </button>
            {open === i && <p style={{ fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.6, padding: "0 14px 14px" }}>{it.a}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function QuizView({ lesson, onPass }: { lesson: Lesson; onPass?: () => void }) {
  const [ans, setAns] = React.useState<Record<number, number>>({});
  const [checked, setChecked] = React.useState(false);
  const qs = lesson.questions || [];
  const score = qs.filter((q, i) => ans[i] === q.answer).length;
  const passed = checked && score === qs.length;

  return (
    <Panel title="Knowledge check" sub={`${qs.length} questions · score ${checked ? score + "/" + qs.length : "—"}`}>
      <div className="col" style={{ gap: 18 }}>
        {qs.map((q, i) => (
          <div key={i}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{i + 1}. {q.q}</div>
            <div className="col" style={{ gap: 8 }}>
              {q.options.map((opt, oi) => {
                const sel = ans[i] === oi;
                const correct = checked && oi === q.answer;
                const wrong = checked && sel && oi !== q.answer;
                return (
                  <button key={oi} onClick={() => !checked && setAns((a) => ({ ...a, [i]: oi }))}
                    className="row" style={{ gap: 10, padding: "10px 13px", borderRadius: 9, textAlign: "left", fontSize: 12.5,
                      border: "1px solid " + (correct ? "var(--signal-green-text)" : wrong ? "var(--signal-red-text)" : sel ? "var(--accent)" : "var(--border-default)"),
                      background: correct ? "var(--signal-green)" : wrong ? "var(--signal-red)" : sel ? "rgba(151,164,214,0.12)" : "var(--page)",
                      color: correct ? "var(--signal-green-text)" : wrong ? "var(--signal-red-text)" : "var(--fg2)" }}>
                    <span className="row" style={{ width: 18, height: 18, borderRadius: "50%", justifyContent: "center", border: "1.5px solid currentColor", flexShrink: 0 }}>
                      {(correct || sel) && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }}></span>}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="row" style={{ gap: 12 }}>
          {!checked ? (
            <button className="pill pill-primary" style={{ opacity: Object.keys(ans).length === qs.length ? 1 : 0.45, pointerEvents: Object.keys(ans).length === qs.length ? "auto" : "none" }}
              onClick={() => { setChecked(true); if (score === qs.length) onPass?.(); }}>Check answers</button>
          ) : (
            <>
              <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: passed ? "var(--signal-green-text)" : "var(--signal-red-text)" }}>
                <Icon name={passed ? "check-circle-2" : "rotate-ccw"} size={16} />{passed ? "Passed — nice work" : `${score}/${qs.length} — review & retry`}
              </span>
              {!passed && <button className="pill pill-soft" onClick={() => { setChecked(false); setAns({}); }}>Try again</button>}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function VideoTabs({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = React.useState("about");
  const tabs: [string, string][] = [["about", "Overview"], ["transcript", "Transcript"]];
  if (lesson.resources && lesson.resources.length) tabs.splice(1, 0, ["resources", "Resources"]);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="row" style={{ gap: 20, padding: "0 20px", borderBottom: "1px solid var(--border-subtle)" }}>
        {tabs.map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      <div style={{ padding: 20 }}>
        {tab === "about" && <p style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.7 }}>{lesson.summary}</p>}
        {tab === "transcript" && <p style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.8, fontStyle: "italic" }}>{lesson.transcript}</p>}
        {tab === "resources" && (
          <div className="col" style={{ gap: 8 }}>
            {(lesson.resources || []).map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 10, fontSize: 12.5, color: "var(--signal-blue-text)" }}>
                <Icon name="paperclip" size={14} style={{ color: "var(--fg-muted)" }} />{r.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function KBLesson({ lessonId, onOpenLesson, onBackOffer, onBackHome, tick }: {
  lessonId: string; onOpenLesson: (id: string) => void; onBackOffer: (id: string) => void; onBackHome: () => void; tick: () => void;
}) {
  const l = lessonById(lessonId);
  if (!l) return null;
  const offer = OFFER_MAP[l.offerId!];
  const flat = lessonsOf(offer);
  const done = progress.isDone(l.id);
  const lid = l.id;
  const next = nextLesson(offer.id, lid);
  const prev = prevLesson(offer.id, lid);

  React.useEffect(() => { progress.setLast(lid); }, [lid]);

  function complete(goNext: boolean) {
    progress.setDone(lid, true);
    tick();
    if (goNext && next) onOpenLesson(next.id);
  }

  return (
    <div className="fade">
      <div className="row" style={{ gap: 8, fontSize: 11.5, color: "var(--fg-muted)", marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={onBackHome} className="row" style={{ gap: 6, color: "var(--fg-muted)" }}><Icon name="graduation-cap" size={13} />Knowledge Base</button>
        <Icon name="chevron-right" size={12} style={{ color: "var(--fg-faint)" }} />
        <button onClick={() => onBackOffer(offer.id)} style={{ color: "var(--fg-muted)" }}>{offer.name}</button>
        <Icon name="chevron-right" size={12} style={{ color: "var(--fg-faint)" }} />
        <span style={{ color: "var(--fg2)" }}>{l.moduleTitle}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18, alignItems: "start" }}>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <TypeChip type={l.type} />
              <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>{l.dur}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{l.title}</h1>
          </div>

          {l.type === "video" && <VideoEmbed lesson={l} />}
          {l.type === "video" && <VideoTabs lesson={l} />}
          {l.type === "article" && <ArticleBody lesson={l} />}
          {l.type === "script" && <ScriptView lesson={l} />}
          {l.type === "file" && <FileView lesson={l} />}
          {l.type === "faq" && <FaqView lesson={l} />}
          {l.type === "quiz" && <QuizView lesson={l} onPass={() => complete(false)} />}

          <div className="card between" style={{ padding: "14px 18px" }}>
            <button className="pill" onClick={() => { progress.toggle(l.id); tick(); }} style={{ background: done ? "var(--signal-green)" : "var(--section)", color: done ? "var(--signal-green-text)" : "var(--fg2)" }}>
              <Icon name={done ? "check-circle-2" : "circle"} size={14} />{done ? "Completed" : "Mark complete"}
            </button>
            <div className="row" style={{ gap: 10 }}>
              {prev && <button className="pill pill-soft" onClick={() => onOpenLesson(prev.id)}><Icon name="arrow-left" size={13} />Previous</button>}
              {next ? <button className="pill pill-primary" onClick={() => complete(true)}>Next lesson<Icon name="arrow-right" size={13} /></button>
                    : <button className="pill pill-primary" onClick={() => { complete(false); onBackOffer(offer.id); }}><Icon name="check" size={13} />Finish offer</button>}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 8, position: "sticky", top: 72 }}>
          <div className="between" style={{ padding: "10px 12px 8px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{offer.name}</span>
            <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{offerProgress(offer).done}/{flat.length}</span>
          </div>
          <div className="col scroll-y" style={{ gap: 1, maxHeight: "calc(100vh - 200px)" }}>
            {offer.modules.map((m) => (
              <div key={m.id}>
                <div className="eyebrow" style={{ padding: "10px 12px 4px" }}>{m.title}</div>
                {m.lessons.map((ll) => {
                  const idx = flat.findIndex((x) => x.id === ll.id) + 1;
                  return <LessonRow key={ll.id} lesson={ll} index={idx} done={progress.isDone(ll.id)} current={ll.id === l.id} onOpen={() => onOpenLesson(ll.id)} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
