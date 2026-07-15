"use client";

import React from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Icon } from "@/components/team/icon";
import { OfferLogo } from "./kb-shared";
import { TYPES, type LessonType, type Lesson, type Offer, type LinkItem, type ArticleBlock, type FaqItem, type QuizQuestion } from "@/lib/types/kb";
import type { LessonInput } from "@/lib/api/kb";
import { useTeamMembers } from "@/hooks/use-team-members";
import { getOfferProgress, uploadKbFile } from "@/lib/api/kb";

const KB_ACCENTS = ["#97A4D6", "#6E7BCB", "#86EFAC", "#C8CFE6", "#E8C45C", "#F8A1A1"];
const KB_CATS = ["SaaS", "Coaching", "Agency", "Fintech", "E-commerce", "Onboarding"];

function ModalShell({ icon, title, sub, onClose, children, footer, width = 540 }: {
  icon: string; title: string; sub: string; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode; width?: number;
}) {
  return (
    <div className="team-scrim team-root" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width, maxHeight: "88vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="row" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--section)", justifyContent: "center" }}><Icon name={icon} size={16} style={{ color: "var(--accent)" }} /></div>
            <div><div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{sub}</div></div>
          </div>
          <button onClick={onClose} className="row" style={{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", color: "var(--fg-muted)" }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16, overflowY: "auto" }}>{children}</div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--border-subtle)" }}>{footer}</div>
      </div>
    </div>
  );
}

function SaveBtn({ valid, onClick, label }: { valid: boolean; onClick: () => void; label: string }) {
  return (
    <button className="pill pill-primary" style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? "auto" : "none" }} onClick={onClick}>
      <Icon name="check" size={13} />{label}
    </button>
  );
}

/* ───────────────────────── Offer ───────────────────────── */
export function OfferModal({ initial, onClose, onSave }: {
  initial?: Offer;
  onClose: () => void;
  onSave: (data: { name: string; tagline: string; category: string; level: string; accent: string; about: string }) => void;
}) {
  const [name, setName] = React.useState(initial?.name || "");
  const [tagline, setTagline] = React.useState(initial?.tagline || "");
  const [cat, setCat] = React.useState(initial?.category || "SaaS");
  const [level, setLevel] = React.useState(initial?.level || "New");
  const [accent, setAccent] = React.useState(initial?.accent || "#97A4D6");
  const [about, setAbout] = React.useState(initial?.about || "");
  const valid = name.trim().length > 1;
  const preview = { name: name || "New Offer", accent };
  return (
    <ModalShell icon="folder-plus" title={initial ? "Edit offer" : "Create offer"} sub="A client company or product your reps will sell" onClose={onClose}
      footer={<><button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <SaveBtn valid={valid} label={initial ? "Save changes" : "Create offer"} onClick={() => onSave({ name: name.trim(), tagline, category: cat, level, accent, about })} /></>}>
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
        <div><label className="lbl">Category</label><NativeSelect className="field" value={cat} onChange={(e) => setCat(e.target.value)}>{KB_CATS.map((c) => <option key={c}>{c}</option>)}</NativeSelect></div>
        <div><label className="lbl">Level</label><NativeSelect className="field" value={level} onChange={(e) => setLevel(e.target.value)}>{["New", "Core offer", "Required"].map((c) => <option key={c}>{c}</option>)}</NativeSelect></div>
      </div>
      <div><label className="lbl">About</label><textarea className="field" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="A short description of this offer for reps." style={{ resize: "vertical" }} /></div>
    </ModalShell>
  );
}

/* ───────────────────────── Module ───────────────────────── */
export function ModuleModal({ initial, onClose, onSave }: { initial?: string; onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = React.useState(initial || "");
  const valid = title.trim().length > 1;
  return (
    <ModalShell icon="layers" title={initial !== undefined ? "Rename module" : "Add module"} sub="A group of lessons within this offer" onClose={onClose} width={460}
      footer={<><button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <SaveBtn valid={valid} label={initial !== undefined ? "Save" : "Add module"} onClick={() => onSave(title.trim())} /></>}>
      <div><label className="lbl">Module title</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Know the product" autoFocus /></div>
    </ModalShell>
  );
}

/* ───────────────────────── Lesson ───────────────────────── */
const fieldStyle: React.CSSProperties = { };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ListSection({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="lbl">{title}</label>
      <div className="col" style={{ gap: 8 }}>{children}</div>
      <button className="row" onClick={onAdd} style={{ gap: 6, marginTop: 8, padding: "7px 11px", fontSize: 11.5, color: "var(--fg-muted)", borderRadius: 8, border: "1px dashed var(--border-default)" }}>
        <Icon name="plus" size={12} />{addLabel}
      </button>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="row" style={{ width: 28, height: 28, borderRadius: 7, justifyContent: "center", color: "var(--signal-red-text)", background: "var(--section)", flexShrink: 0 }}><Icon name="x" size={13} /></button>;
}

export function LessonModal({ initial, onClose, onSave }: {
  initial?: Lesson;
  onClose: () => void;
  onSave: (data: LessonInput) => void;
}) {
  const [title, setTitle] = React.useState(initial?.title || "");
  const [type, setType] = React.useState<LessonType>(initial?.type || "video");
  const [dur, setDur] = React.useState(initial?.dur || "");
  const [mins, setMins] = React.useState<number>(initial?.mins || 0);
  const [summary, setSummary] = React.useState(initial?.summary || "");

  // Per-type content state
  const [loom, setLoom] = React.useState(initial?.loom || "");
  const [transcript, setTranscript] = React.useState(initial?.transcript || "");
  const [resources, setResources] = React.useState<LinkItem[]>(initial?.resources || []);
  const [body, setBody] = React.useState<ArticleBlock[]>(initial?.body || [{ h: "", p: "" }]);
  const [hook, setHook] = React.useState(initial?.script?.hook || "");
  const [points, setPoints] = React.useState<string[]>(initial?.script?.points || [""]);
  const [objections, setObjections] = React.useState<{ o: string; a: string }[]>(initial?.script?.objections || [{ o: "", a: "" }]);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(initial?.questions || [{ q: "", options: ["", ""], answer: 0 }]);
  const [items, setItems] = React.useState<FaqItem[]>(initial?.items || [{ q: "", a: "" }]);
  const [files, setFiles] = React.useState<LinkItem[]>(initial?.files || []);
  const [uploading, setUploading] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!f) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const meta = await uploadKbFile(f);
      setFiles((prev) => [...prev, meta]);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const valid = title.trim().length > 1;
  const typeKeys = Object.keys(TYPES) as LessonType[];
  const loomOk = /loom\.com\//i.test(loom);

  function buildContent(): Record<string, unknown> {
    switch (type) {
      case "video": return { loom, transcript, resources: resources.filter((r) => r.name && r.url) };
      case "article": return { body: body.filter((b) => b.h || b.p) };
      case "script": return { script: { hook, points: points.filter(Boolean), objections: objections.filter((o) => o.o || o.a) } };
      case "quiz": return { questions: questions.filter((q) => q.q && q.options.filter(Boolean).length >= 2) };
      case "faq": return { items: items.filter((it) => it.q || it.a) };
      case "file": return { files: files.filter((f) => f.name && f.url) };
      default: return {};
    }
  }

  function submit() {
    onSave({
      title: title.trim(),
      type,
      dur: dur || (type === "video" ? "0:00" : TYPES[type].label),
      mins: mins || (type === "video" ? 6 : 4),
      summary,
      content: buildContent(),
    });
  }

  return (
    <ModalShell icon="file-plus-2" title={initial ? "Edit lesson" : "Add lesson"} sub="Video, article, script, resource, FAQ or quiz" onClose={onClose} width={620}
      footer={<><button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <SaveBtn valid={valid} label={initial ? "Save lesson" : "Add lesson"} onClick={submit} /></>}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
        <div><label className="lbl">Duration label</label><input className="field" style={fieldStyle} value={dur} onChange={(e) => setDur(e.target.value)} placeholder={type === "video" ? "8:24" : "5 min read"} /></div>
        <div><label className="lbl">Summary</label><input className="field" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line on what this covers." /></div>
      </div>
      <div style={{ width: 140 }}><label className="lbl">Minutes (for totals)</label><input className="field" type="number" min={0} value={mins} onChange={(e) => setMins(Number(e.target.value) || 0)} /></div>

      {/* ── Per-type content ── */}
      {type === "video" && (
        <>
          <div>
            <label className="lbl">Loom / video share link</label>
            <input className="field" value={loom} onChange={(e) => setLoom(e.target.value)} placeholder="https://www.loom.com/share/…" />
            {loom && <div style={{ fontSize: 11, marginTop: 6, color: loomOk ? "var(--fg2)" : "var(--signal-red-text)" }}>{loomOk ? "Loom link detected." : "Tip: paste a loom.com share link."}</div>}
          </div>
          <div><label className="lbl">Transcript</label><textarea className="field" rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Optional — paste the transcript." style={{ resize: "vertical" }} /></div>
          <ListSection title="Resources (links)" addLabel="Add resource link" onAdd={() => setResources([...resources, { name: "", url: "" }])}>
            {resources.map((r, i) => (
              <div key={i} className="row" style={{ gap: 8 }}>
                <input className="field" style={{ flex: 1 }} value={r.name} onChange={(e) => setResources(resources.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" />
                <input className="field" style={{ flex: 1.4 }} value={r.url} onChange={(e) => setResources(resources.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" />
                <RemoveBtn onClick={() => setResources(resources.filter((_, j) => j !== i))} />
              </div>
            ))}
          </ListSection>
        </>
      )}

      {type === "article" && (
        <ListSection title="Article sections" addLabel="Add section" onAdd={() => setBody([...body, { h: "", p: "" }])}>
          {body.map((b, i) => (
            <div key={i} className="col" style={{ gap: 6, padding: 10, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--page)" }}>
              <div className="row" style={{ gap: 8 }}>
                <input className="field" style={{ flex: 1 }} value={b.h} onChange={(e) => setBody(body.map((x, j) => j === i ? { ...x, h: e.target.value } : x))} placeholder="Heading" />
                <RemoveBtn onClick={() => setBody(body.filter((_, j) => j !== i))} />
              </div>
              <textarea className="field" rows={2} value={b.p} onChange={(e) => setBody(body.map((x, j) => j === i ? { ...x, p: e.target.value } : x))} placeholder="Paragraph…" style={{ resize: "vertical" }} />
            </div>
          ))}
        </ListSection>
      )}

      {type === "script" && (
        <>
          <div><label className="lbl">Opening hook</label><textarea className="field" rows={2} value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Hi {{first_name}}, the reason for my call is…" style={{ resize: "vertical" }} /></div>
          <ListSection title="Talking points" addLabel="Add point" onAdd={() => setPoints([...points, ""])}>
            {points.map((p, i) => (
              <div key={i} className="row" style={{ gap: 8 }}>
                <input className="field" style={{ flex: 1 }} value={p} onChange={(e) => setPoints(points.map((x, j) => j === i ? e.target.value : x))} placeholder="Talking point" />
                <RemoveBtn onClick={() => setPoints(points.filter((_, j) => j !== i))} />
              </div>
            ))}
          </ListSection>
          <ListSection title="Objection handlers" addLabel="Add objection" onAdd={() => setObjections([...objections, { o: "", a: "" }])}>
            {objections.map((ob, i) => (
              <div key={i} className="col" style={{ gap: 6, padding: 10, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--page)" }}>
                <div className="row" style={{ gap: 8 }}>
                  <input className="field" style={{ flex: 1 }} value={ob.o} onChange={(e) => setObjections(objections.map((x, j) => j === i ? { ...x, o: e.target.value } : x))} placeholder="Objection" />
                  <RemoveBtn onClick={() => setObjections(objections.filter((_, j) => j !== i))} />
                </div>
                <textarea className="field" rows={2} value={ob.a} onChange={(e) => setObjections(objections.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="How to respond…" style={{ resize: "vertical" }} />
              </div>
            ))}
          </ListSection>
        </>
      )}

      {type === "quiz" && (
        <ListSection title="Questions" addLabel="Add question" onAdd={() => setQuestions([...questions, { q: "", options: ["", ""], answer: 0 }])}>
          {questions.map((q, qi) => (
            <div key={qi} className="col" style={{ gap: 8, padding: 12, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--page)" }}>
              <div className="row" style={{ gap: 8 }}>
                <input className="field" style={{ flex: 1 }} value={q.q} onChange={(e) => setQuestions(questions.map((x, j) => j === qi ? { ...x, q: e.target.value } : x))} placeholder={`Question ${qi + 1}`} />
                <RemoveBtn onClick={() => setQuestions(questions.filter((_, j) => j !== qi))} />
              </div>
              <div className="col" style={{ gap: 6 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="row" style={{ gap: 8 }}>
                    <button onClick={() => setQuestions(questions.map((x, j) => j === qi ? { ...x, answer: oi } : x))} title="Mark correct"
                      className="row" style={{ width: 22, height: 22, borderRadius: "50%", justifyContent: "center", flexShrink: 0, border: "1.5px solid " + (q.answer === oi ? "var(--signal-green-text)" : "var(--border-default)"), color: "var(--signal-green-text)" }}>
                      {q.answer === oi && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "currentColor" }} />}
                    </button>
                    <input className="field" style={{ flex: 1 }} value={opt} onChange={(e) => setQuestions(questions.map((x, j) => j === qi ? { ...x, options: x.options.map((o, k) => k === oi ? e.target.value : o) } : x))} placeholder={`Option ${oi + 1}`} />
                    {q.options.length > 2 && <RemoveBtn onClick={() => setQuestions(questions.map((x, j) => j === qi ? { ...x, options: x.options.filter((_, k) => k !== oi), answer: Math.min(x.answer, x.options.length - 2) } : x))} />}
                  </div>
                ))}
                <button className="row" onClick={() => setQuestions(questions.map((x, j) => j === qi ? { ...x, options: [...x.options, ""] } : x))} style={{ gap: 6, fontSize: 11, color: "var(--fg-muted)", marginLeft: 30 }}><Icon name="plus" size={11} />Add option</button>
              </div>
            </div>
          ))}
        </ListSection>
      )}

      {type === "faq" && (
        <ListSection title="Questions & answers" addLabel="Add Q&A" onAdd={() => setItems([...items, { q: "", a: "" }])}>
          {items.map((it, i) => (
            <div key={i} className="col" style={{ gap: 6, padding: 10, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--page)" }}>
              <div className="row" style={{ gap: 8 }}>
                <input className="field" style={{ flex: 1 }} value={it.q} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question" />
                <RemoveBtn onClick={() => setItems(items.filter((_, j) => j !== i))} />
              </div>
              <textarea className="field" rows={2} value={it.a} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="Answer…" style={{ resize: "vertical" }} />
            </div>
          ))}
        </ListSection>
      )}

      {type === "file" && (
        <div>
          <label className="lbl">Files</label>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onPickFile} />
          <div className="col" style={{ gap: 8 }}>
            {files.map((f, i) =>
              f.key ? (
                // Uploaded file — name is fixed; just show + allow removal.
                <div key={i} className="between" style={{ padding: "9px 12px", borderRadius: 9, background: "var(--page)", border: "1px solid var(--border-subtle)" }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <div className="row" style={{ width: 30, height: 30, borderRadius: 7, justifyContent: "center", background: "var(--section)", flexShrink: 0 }}><Icon name="file-text" size={14} style={{ color: "var(--fg-muted)" }} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{f.size ? fmtBytes(f.size) : "Uploaded"}</div>
                    </div>
                  </div>
                  <RemoveBtn onClick={() => setFiles(files.filter((_, j) => j !== i))} />
                </div>
              ) : (
                // External linked resource.
                <div key={i} className="row" style={{ gap: 8 }}>
                  <input className="field" style={{ flex: 1 }} value={f.name} onChange={(e) => setFiles(files.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="File name" />
                  <input className="field" style={{ flex: 1.4 }} value={f.url} onChange={(e) => setFiles(files.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" />
                  <RemoveBtn onClick={() => setFiles(files.filter((_, j) => j !== i))} />
                </div>
              ),
            )}
          </div>
          {uploadErr && <div style={{ fontSize: 11, color: "var(--signal-red-text)", marginTop: 6 }}>{uploadErr}</div>}
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="row" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ gap: 6, padding: "7px 11px", fontSize: 11.5, color: "var(--fg)", borderRadius: 8, border: "1px solid var(--border-default)", opacity: uploading ? 0.6 : 1 }}>
              <Icon name="file-plus-2" size={13} />{uploading ? "Uploading…" : "Upload file"}
            </button>
            <button className="row" onClick={() => setFiles([...files, { name: "", url: "" }])}
              style={{ gap: 6, padding: "7px 11px", fontSize: 11.5, color: "var(--fg-muted)", borderRadius: 8, border: "1px dashed var(--border-default)" }}>
              <Icon name="plus" size={12} />Add link
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 8 }}>Upload PDFs, docs, slides or images (up to 100 MB) — PDFs and images preview inside the lesson. Or paste an external link.</p>
        </div>
      )}
    </ModalShell>
  );
}

/* ───────────────────────── Assign members ───────────────────────── */
export function AssignMembersModal({ offer, assignedUserIds, onClose, onSave }: {
  offer: Offer;
  assignedUserIds: string[];
  onClose: () => void;
  onSave: (userIds: string[]) => void;
}) {
  const { members } = useTeamMembers();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(assignedUserIds));
  const [progressByUser, setProgressByUser] = React.useState<Record<string, number>>({});
  const [totalLessons, setTotalLessons] = React.useState(0);

  React.useEffect(() => {
    getOfferProgress(offer.id)
      .then((p) => {
        setTotalLessons(p.totalLessons);
        const m: Record<string, number> = {};
        for (const row of p.members) m[row.userId] = row.completed;
        setProgressByUser(m);
      })
      .catch(() => {});
  }, [offer.id]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <ModalShell icon="user-plus" title="Assign members" sub={`Who should learn "${offer.name}"`} onClose={onClose} width={520}
      footer={<><button className="pill pill-soft" onClick={onClose}>Cancel</button>
        <SaveBtn valid label="Save assignments" onClick={() => onSave(Array.from(selected))} /></>}>
      {members.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-muted)", textAlign: "center", padding: 12 }}>No team members yet. Invite members from Settings → Team.</div>
      ) : (
        <div className="col" style={{ gap: 4 }}>
          {members.map((m) => {
            const on = selected.has(m.id);
            const done = progressByUser[m.id] || 0;
            return (
              <button key={m.id} onClick={() => toggle(m.id)} className="row" style={{ gap: 12, padding: "10px 12px", borderRadius: 10, textAlign: "left", background: on ? "rgba(151,164,214,0.10)" : "transparent", border: "1px solid " + (on ? "var(--accent)" : "var(--border-subtle)") }}>
                <span className="row" style={{ width: 20, height: 20, borderRadius: 6, justifyContent: "center", flexShrink: 0, border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-default)"), background: on ? "var(--accent)" : "transparent", color: "var(--on-accent)" }}>
                  {on && <Icon name="check" size={12} strokeWidth={3} />}
                </span>
                <span className="grow">
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 500 }}>{m.name}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--fg-muted)" }}>{m.email}</span>
                </span>
                {on && totalLessons > 0 && (
                  <span style={{ fontSize: 11, color: done >= totalLessons ? "var(--signal-green-text)" : "var(--fg-muted)" }}>{done}/{totalLessons} done</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
