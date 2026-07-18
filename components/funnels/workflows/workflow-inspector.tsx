"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X, Loader2, BookmarkPlus, Check, Paperclip } from "lucide-react";
import type { Workflow, WorkflowNode, WorkflowSettings, WorkflowStatus } from "@/lib/types/workflow";
import { NativeSelect } from "@/components/ui/native-select";
import { SignaturePicker } from "@/components/shared/signature-picker";
import { VariablePicker } from "./variable-picker";
import { listEmailAccounts } from "@/lib/api/email-accounts";
import type { EmailAccount } from "@/lib/types/email-accounts";
import { listLinkedInAccounts, type LinkedInAccount } from "@/lib/api/linkedin";
import { getPhoneLines } from "@/lib/api/phone-lines";
import type { PhoneLine } from "@/lib/types/calling";
import { listTemplates, createTemplate, listTemplateAttachments, uploadTemplateAttachment } from "@/lib/api/templates";
import type { Template } from "@/lib/types/template";
import { getWhatsappSettings, listWhatsappTemplates, type WhatsappSettings, type WhatsappTemplate } from "@/lib/api/whatsapp";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { listPipelines } from "@/lib/api/opportunities";
import type { Pipeline } from "@/lib/types/opportunity";
import { getSmartViews, type SmartView } from "@/lib/api/smart-views";
import { listCustomFields } from "@/lib/api/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types/custom-field";
import { NODE_TYPES } from "./node-types";

const lab = "block text-[10px] uppercase tracking-wider text-ink-muted font-medium mt-4 mb-1.5";
const inp = "w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";
const area = inp + " resize-none min-h-[110px] leading-relaxed";

const LEAD_STATUSES = ["New", "Contacted", "No Answer", "Interested", "Meeting Booked", "Not Interested", "Won"];

interface InspectorProps {
  node: WorkflowNode | null;
  onNodeData: (id: string, patch: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onDeselect: () => void;
  workflow: Workflow;
  /** Org-level workflow (funnelId null) → offer meeting/opportunity triggers. */
  orgLevel?: boolean;
  onRename: (name: string) => void;
  onStatus: (status: WorkflowStatus) => void;
  onSettings: (patch: WorkflowSettings) => void;
}

export function WorkflowInspector(p: InspectorProps) {
  if (!p.node) return <SettingsPanel {...p} />;
  return <NodePanel {...p} node={p.node} />;
}

function NodePanel({ node, onNodeData, onDeleteNode, onDeselect, orgLevel }: InspectorProps & { node: WorkflowNode }) {
  const def = NODE_TYPES[node.type];
  const Icon = def.icon;
  const d = node.data || {};
  const set = (patch: Record<string, unknown>) => onNodeData(node.id, patch);
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");

  return (
    <div className="p-[18px] pb-10">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-section shrink-0 text-ink-secondary"><Icon size={16} strokeWidth={1.75} /></span>
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">{def.kicker}</div>
          <div className="text-[15px] font-semibold text-ink">{def.label}</div>
        </div>
        <button onClick={onDeselect} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-faint bg-section hover:bg-hover"><X size={14} /></button>
      </div>

      {node.type === "trigger" && <TriggerForm d={d} set={set} v={v} orgLevel={!!orgLevel} />}

      {node.type === "email" && <EmailStepForm d={d} set={set} />}

      {node.type === "sms" && <SmsStepForm d={d} set={set} />}

      {node.type === "whatsapp" && <WhatsappStepForm d={d} set={set} />}

      {node.type === "linkedin" && <LinkedInStepForm d={d} set={set} />}

      {node.type === "call" && (<>
        <label className={lab}>Task title</label>
        <input className={inp} value={v("title")} onChange={(e) => set({ title: e.target.value })} />
        <label className={lab}>Call script / notes</label>
        <textarea className={area} value={v("script")} onChange={(e) => set({ script: e.target.value })} />
      </>)}

      {node.type === "wait" && (<>
        <label className={lab}>Wait duration</label>
        <div className="flex gap-2">
          <input type="number" className={inp + " w-20"} value={v("amount")} onChange={(e) => set({ amount: Number(e.target.value) })} />
          <NativeSelect className={inp + " flex-1"} value={v("unit")} onChange={(e) => set({ unit: e.target.value })}>
            <option value="minutes">minutes</option><option value="hours">hours</option><option value="days">days</option><option value="weeks">weeks</option>
          </NativeSelect>
        </div>
        <p className="text-[11px] text-ink-faint mt-2">Continues to the next step after the delay.</p>
      </>)}

      {node.type === "waitevent" && (<>
        <label className={lab}>Wait until</label>
        <NativeSelect className={inp} value={v("event")} onChange={(e) => set({ event: e.target.value })}>
          <option value="email_opened">Email is opened</option><option value="link_clicked">Link is clicked</option>
          <option value="replied">Lead replies</option><option value="meeting_booked">Meeting is booked</option>
        </NativeSelect>
        <label className={lab}>Timeout after</label>
        <div className="flex gap-2">
          <input type="number" className={inp + " w-20"} value={v("amount")} onChange={(e) => set({ amount: Number(e.target.value) })} />
          <NativeSelect className={inp + " flex-1"} value={v("unit")} onChange={(e) => set({ unit: e.target.value })}>
            <option value="hours">hours</option><option value="days">days</option><option value="weeks">weeks</option>
          </NativeSelect>
        </div>
      </>)}

      {node.type === "condition" && (<>
        <label className={lab}>Label</label>
        <input className={inp} value={v("label")} onChange={(e) => set({ label: e.target.value })} />
        <label className={lab}>Branch when</label>
        <NativeSelect className={inp} value={v("field")} onChange={(e) => set({ field: e.target.value })}>
          <option value="replied">Lead has replied</option><option value="opened">Email was opened</option>
          <option value="clicked">A link was clicked</option><option value="status">Status equals…</option><option value="has_tag">Has tag…</option>
        </NativeSelect>
        <div className="bg-section rounded-[9px] p-3 mt-3 text-[12px] text-ink-muted leading-relaxed">Matching leads take the <strong className="text-signal-green-text">Yes</strong> branch; everyone else takes <strong className="text-signal-red-text">No</strong>.</div>
      </>)}

      {node.type === "abtest" && (<>
        <label className={lab}>Split to path A</label>
        <input type="range" min={0} max={100} step={5} value={Number(v("splitA") || 50)} onChange={(e) => set({ splitA: Number(e.target.value) })} className="w-full mt-1.5" style={{ accentColor: "var(--color-accent)" }} />
        <div className="flex justify-between text-[12px] text-ink-muted mt-1.5"><span>A · <strong className="text-ink">{v("splitA") || 50}%</strong></span><span>B · <strong className="text-ink">{100 - Number(v("splitA") || 50)}%</strong></span></div>
      </>)}

      {node.type === "status" && (<>
        <label className={lab}>Set lead status to</label>
        <NativeSelect className={inp} value={v("to")} onChange={(e) => set({ to: e.target.value })}>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
      </>)}

      {node.type === "tag" && (<>
        <label className={lab}>Action</label>
        <NativeSelect className={inp} value={v("mode")} onChange={(e) => set({ mode: e.target.value })}><option value="add">Add tag</option><option value="remove">Remove tag</option></NativeSelect>
        <label className={lab}>Tag</label>
        <input className={inp} value={v("tag")} onChange={(e) => set({ tag: e.target.value })} />
      </>)}

      {node.type === "field" && (<>
        <label className={lab}>Field</label>
        <input className={inp} value={v("field")} onChange={(e) => set({ field: e.target.value })} />
        <label className={lab}>Operation</label>
        <NativeSelect className={inp} value={v("op")} onChange={(e) => set({ op: e.target.value })}><option value="set">Set to</option><option value="increase">Increase by</option><option value="decrease">Decrease by</option><option value="clear">Clear</option></NativeSelect>
        <label className={lab}>Value</label>
        <input className={inp} value={v("value")} onChange={(e) => set({ value: e.target.value })} />
      </>)}

      {node.type === "assign" && (<>
        <label className={lab}>Assign owner</label>
        <NativeSelect className={inp} value={v("owner")} onChange={(e) => set({ owner: e.target.value })}><option value="Round robin">Round robin (team)</option><option value="me">Me</option></NativeSelect>
        <p className="text-[11px] text-ink-faint mt-2">Round robin rotates across this campaign&apos;s members.</p>
      </>)}

      {node.type === "opportunity" && <OpportunityStepForm set={set} v={v} />}

      {node.type === "webhook" && (<>
        <label className={lab}>Method</label>
        <NativeSelect className={inp} value={v("method")} onChange={(e) => set({ method: e.target.value })}><option value="POST">POST</option><option value="PUT">PUT</option><option value="GET">GET</option></NativeSelect>
        <label className={lab}>Endpoint URL</label>
        <input className={inp} value={v("url")} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
      </>)}

      {(node.type === "goal" || node.type === "end") && (<>
        <label className={lab}>Label</label>
        <input className={inp} value={v("label")} onChange={(e) => set({ label: e.target.value })} />
        <div className="bg-section rounded-[9px] p-3 mt-3 text-[12px] text-ink-muted leading-relaxed">{node.type === "goal" ? "Marks the enrollment as a successful goal and ends it." : "Ends the workflow for this lead."}</div>
      </>)}

      {!def.fixed && (
        <button onClick={() => onDeleteNode(node.id)} className="flex items-center justify-center gap-1.5 w-full mt-6 py-2.5 rounded-[9px] border border-signal-red bg-signal-red text-signal-red-text text-[12px] font-semibold">
          <Trash2 size={13} /> Delete step
        </button>
      )}
    </div>
  );
}

function SettingsPanel({ workflow, onRename, onStatus, onSettings }: InspectorProps) {
  const s = workflow.settings || {};
  const STATUSES: WorkflowStatus[] = ["draft", "active", "paused"];
  return (
    <div className="p-[18px] pb-10">
      <div className="text-[15px] font-semibold text-ink mb-4">Workflow settings</div>
      <label className={lab + " mt-0"}>Name</label>
      <input className={inp} value={workflow.name} onChange={(e) => onRename(e.target.value)} />
      <label className={lab}>Status</label>
      <div className="flex gap-1.5 mt-1.5">
        {STATUSES.map((st) => (
          <button key={st} onClick={() => onStatus(st)} className={
            "flex-1 capitalize px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors " +
            (workflow.status === st ? "bg-ink text-on-ink border-transparent" : "bg-section text-ink-secondary border-border-subtle hover:bg-hover")
          }>{st}</button>
        ))}
      </div>

      <div className="h-px bg-border-subtle my-5" />
      <div className={lab + " mt-0"}>Re-enrollment</div>
      <label className="flex items-center gap-2.5 text-[12.5px] text-ink-secondary cursor-pointer mt-2">
        <input type="checkbox" checked={!!s.reEnroll} onChange={(e) => onSettings({ reEnroll: e.target.checked })} style={{ accentColor: "var(--color-accent)" }} />
        Allow leads to re-enter this workflow
      </label>
      <div className={lab}>Exit conditions</div>
      <label className="flex items-center gap-2.5 text-[12.5px] text-ink-secondary cursor-pointer mt-2">
        <input type="checkbox" checked={s.exitOnReply !== false} onChange={(e) => onSettings({ exitOnReply: e.target.checked })} style={{ accentColor: "var(--color-accent)" }} />
        Exit when the lead replies
      </label>
      <label className="flex items-center gap-2.5 text-[12.5px] text-ink-secondary cursor-pointer mt-2">
        <input type="checkbox" checked={s.exitOnMeeting !== false} onChange={(e) => onSettings({ exitOnMeeting: e.target.checked })} style={{ accentColor: "var(--color-accent)" }} />
        Exit when a meeting is booked
      </label>

      <div className="h-px bg-border-subtle my-5" />
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink-faint mb-2.5">Performance</div>
      <div className="grid grid-cols-3 gap-2">
        {[["Enrolled", workflow.stats.enrolled], ["In progress", workflow.stats.active], ["Completed", workflow.stats.completed]].map(([l, val]) => (
          <div key={l} className="bg-section/60 border border-border-subtle rounded-[10px] p-3">
            <div className="text-[18px] font-bold text-ink">{val}</div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] text-ink-faint leading-relaxed mt-4">Select any step on the canvas to configure it. Drag a port to connect steps.</p>
    </div>
  );
}

// ─── Email / SMS step forms (From, template, variables, save-as-template) ──

function FieldHeader({ label, picker }: { label: string; picker?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-4 mb-1.5">
      <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{label}</span>
      {picker}
    </div>
  );
}

function SaveTemplateRow({ subject, body, channel, onSaved }: { subject?: string; body: string; channel: "email" | "sms"; onSaved: (t: Template) => void }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const t = await createTemplate({ name: name.trim(), channel, subject, body });
      onSaved(t);
      setShow(false); setName(""); setDone(true); setTimeout(() => setDone(false), 2500);
    } finally { setSaving(false); }
  }
  if (show) {
    return (
      <div className="flex items-center gap-1.5 mt-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name"
          className="flex-1 px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
        <button onClick={() => void save()} disabled={saving || !name.trim()} className="px-3 py-2 rounded-[8px] bg-ink text-on-ink text-[11px] font-medium disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
        </button>
        <button onClick={() => setShow(false)} className="px-2 py-2 text-ink-muted text-[11px]">Cancel</button>
      </div>
    );
  }
  return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-ink-muted hover:text-ink-secondary">
      {done ? <><Check size={12} className="text-signal-green-text" /> Saved as template</> : <><BookmarkPlus size={12} /> Save as template</>}
    </button>
  );
}

function LinkedInStepForm({ d, set }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void }) {
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const action = v("action") || "connection";
  const isActor = v("senderMode") === "actor";

  useEffect(() => { listLinkedInAccounts().then(setAccounts).catch(() => {}); }, []);

  return (
    <>
      <label className={lab}>Action</label>
      <NativeSelect className={inp} value={action} onChange={(e) => set({ action: e.target.value })}>
        <option value="connection">Connection request + note</option>
        <option value="message">Send message</option>
        <option value="visit">Visit profile</option>
      </NativeSelect>

      <label className={lab}>Send as</label>
      <NativeSelect className={inp} value={v("senderMode")} onChange={(e) => set({ senderMode: e.target.value })}>
        <option value="">A fixed account (choose below)</option>
        <option value="actor">The user who triggered the workflow</option>
      </NativeSelect>
      {isActor && (
        <p className="text-[11px] text-ink-faint mt-1.5">
          Runs from the LinkedIn account of whoever fired the trigger. If they have none connected, the fallback below is used.
        </p>
      )}

      <label className={lab}>{isActor ? "Fallback account" : "LinkedIn account"}</label>
      <NativeSelect className={inp} value={v("accountId")} onChange={(e) => set({ accountId: e.target.value })}>
        <option value="">First connected account</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.ownerName ? `${a.ownerName} · ${a.name || "LinkedIn"}` : a.name || a.unipileAccountId}</option>
        ))}
      </NativeSelect>
      {accounts.length === 0 && <p className="text-[11px] text-ink-faint mt-1.5">No LinkedIn connected — add one in Settings → LinkedIn.</p>}

      {action !== "visit" && (
        <>
          <FieldHeader label={action === "connection" ? "Connection note" : "Message"} picker={<VariablePicker targetRef={msgRef} value={v("message")} onChange={(val) => set({ message: val })} />} />
          <textarea ref={msgRef} className={area} value={v("message")} onChange={(e) => set({ message: e.target.value })}
            placeholder={action === "connection" ? "Hi {{first_name}}, saw you lead growth at {{company}} — keen to connect." : "Thanks for connecting {{first_name}}!"} />
          {action === "message" && <p className="text-[11px] text-ink-faint mt-1.5">Messages only reach 1st-degree connections. Chain after a connection request + wait for best results.</p>}
        </>
      )}
      <p className="text-[11px] text-ink-faint mt-2">Requires the lead to have a LinkedIn URL. Daily limits apply (80 invites, 100 messages, 300 profile views).</p>
    </>
  );
}

function EmailStepForm({ d, set }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void }) {
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const [uploading, setUploading] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Attached files live on the node as parallel arrays: ids feed the engine,
  // the {id, name} list is only for display here.
  const attached = Array.isArray(d.attachments) ? (d.attachments as { id: string; name: string }[]) : [];

  useEffect(() => {
    listEmailAccounts().then(setAccounts).catch(() => {});
    listTemplates("email").then(setTemplates).catch(() => {});
  }, []);

  function setAttached(next: { id: string; name: string }[]) {
    set({ attachments: next, attachmentIds: next.map((a) => a.id) });
  }

  async function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    set({ subject: t.subject || "", body: t.body || "" });
    try {
      const atts = await listTemplateAttachments(t.id);
      setAttached(atts.map((a) => ({ id: a.id, name: a.fileName })));
    } catch {
      setAttached([]);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: { id: string; name: string }[] = [];
      for (const file of Array.from(files)) {
        const a = await uploadTemplateAttachment(file, null);
        uploaded.push({ id: a.id, name: a.fileName });
      }
      setAttached([...attached, ...uploaded]);
    } catch {
      // upload errors are non-fatal; the chip simply doesn't appear
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <label className={lab}>Send as</label>
      <NativeSelect className={inp} value={v("senderMode")} onChange={(e) => set({ senderMode: e.target.value })}>
        <option value="">A fixed mailbox (choose below)</option>
        <option value="actor">The user who triggered the workflow</option>
      </NativeSelect>
      {v("senderMode") === "actor" && (
        <p className="text-[11px] text-ink-faint mt-1.5">
          Sends from the mailbox of whoever fired the trigger (e.g. changed the status or added the
          lead). If they have no connected mailbox, the fallback below is used.
        </p>
      )}

      <label className={lab}>{v("senderMode") === "actor" ? "Fallback mailbox" : "From"}</label>
      <NativeSelect className={inp} value={v("accountId")} onChange={(e) => {
        const id = e.target.value; const acc = accounts.find((a) => a.id === id);
        set({ accountId: id, from: acc?.email || "" });
      }}>
        <option value="">Default mailbox</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.fromName ? `${a.fromName} · ${a.email}` : a.email}</option>)}
      </NativeSelect>
      {accounts.length === 0 && <p className="text-[11px] text-ink-faint mt-1.5">No mailbox connected — add one in Settings → Email.</p>}

      <SignaturePicker
        label="Signature"
        labelClassName={lab}
        className={inp}
        value={v("signatureId") || "default"}
        onChange={(val) => set({ signatureId: val })}
      />

      <label className={lab}>Template</label>
      <NativeSelect className={inp} value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
        <option value="">Start from scratch…</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </NativeSelect>

      <FieldHeader label="Subject" picker={<VariablePicker targetRef={subjectRef} value={v("subject")} onChange={(val) => set({ subject: val })} />} />
      <input ref={subjectRef} className={inp} value={v("subject")} onChange={(e) => set({ subject: e.target.value })} placeholder="Quick question, {{first_name}}" />

      <FieldHeader label="Body" picker={<VariablePicker targetRef={bodyRef} value={v("body")} onChange={(val) => set({ body: val })} />} />
      <textarea ref={bodyRef} className={area} value={v("body")} onChange={(e) => set({ body: e.target.value })} />

      <label className={lab}>Attachments</label>
      {attached.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attached.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] text-ink">
              <Paperclip size={11} className="text-ink-muted shrink-0" />
              <span className="truncate max-w-[160px]">{a.name}</span>
              <button type="button" onClick={() => setAttached(attached.filter((x) => x.id !== a.id))}
                className="p-0.5 rounded-full hover:bg-hover text-ink-muted hover:text-ink" aria-label={`Remove ${a.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover disabled:opacity-50">
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {uploading ? "Uploading…" : "Attach file"}
      </button>

      <SaveTemplateRow channel="email" subject={v("subject")} body={v("body")} onSaved={(t) => setTemplates((p) => [t, ...p])} />
      <p className="text-[11px] text-ink-faint mt-3">Use {"{{first_name}}"}, {"{{company}}"} or any custom field for personalization.</p>
    </>
  );
}

function SmsStepForm({ d, set }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void }) {
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const msgRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getPhoneLines().then((ls) => setLines(ls.filter((l) => l.status === "active"))).catch(() => {});
    listTemplates("sms").then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (t) set({ message: t.body || "" });
  }
  const msg = v("message");

  return (
    <>
      <label className={lab}>Send as</label>
      <NativeSelect className={inp} value={v("senderMode")} onChange={(e) => set({ senderMode: e.target.value })}>
        <option value="">A fixed number (choose below)</option>
        <option value="actor">The user who triggered the workflow</option>
      </NativeSelect>
      {v("senderMode") === "actor" && (
        <p className="text-[11px] text-ink-faint mt-1.5">
          Texts from the phone line assigned to whoever fired the trigger. If they have no assigned
          line, the fallback below is used.
        </p>
      )}

      <label className={lab}>{v("senderMode") === "actor" ? "Fallback number" : "From number"}</label>
      <NativeSelect className={inp} value={v("lineId")} onChange={(e) => set({ lineId: e.target.value })}>
        <option value="">Auto (match recipient country)</option>
        {lines.map((l) => <option key={l.id} value={l.id}>{l.friendlyName ? `${l.friendlyName} · ${l.number}` : l.number}</option>)}
      </NativeSelect>
      {lines.length === 0 && <p className="text-[11px] text-ink-faint mt-1.5">No active phone line available.</p>}

      <label className={lab}>Template</label>
      <NativeSelect className={inp} value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
        <option value="">Start from scratch…</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </NativeSelect>

      <FieldHeader label="Message" picker={<VariablePicker targetRef={msgRef} value={msg} onChange={(val) => set({ message: val })} />} />
      <textarea ref={msgRef} className={area} value={msg} onChange={(e) => set({ message: e.target.value })} />
      <p className="text-[11px] text-ink-faint mt-1.5">{msg.length} chars · {Math.max(1, Math.ceil(msg.length / 160))} segment(s) · use {"{{first_name}}"} or custom fields.</p>

      <SaveTemplateRow channel="sms" body={msg} onSaved={(t) => setTemplates((p) => [t, ...p])} />
    </>
  );
}

function WhatsappStepForm({ d, set }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void }) {
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getWhatsappSettings().then(setSettings).catch(() => {});
    listWhatsappTemplates().then(setTemplates).catch(() => {});
  }, []);

  const msg = v("message");
  const mode = v("mode") || "freeform";
  const approved = templates.filter((t) => t.status === "APPROVED");
  const selected = approved.find((t) => t.name === v("templateName")) || null;
  const tvars = Array.isArray(d.templateVariables) ? (d.templateVariables as string[]) : [];
  const modeBtn = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${active ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink"}`;

  function pickTemplate(name: string) {
    const t = approved.find((x) => x.name === name);
    set({
      templateName: name,
      templateLanguage: t?.language || "",
      contentBody: t?.bodyText || "",
      templateVariables: t ? Array(t.bodyVariableCount).fill("") : [],
    });
  }

  return (
    <>
      {settings && !settings.connected && (
        <p className="text-[11px] text-signal-amber-text mt-4">
          No WhatsApp connected — link your WhatsApp in Settings → WhatsApp for this step to send.
        </p>
      )}

      <label className={lab}>Message type</label>
      <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
        <button type="button" onClick={() => set({ mode: "template" })} className={modeBtn(mode === "template")}>
          Approved template
        </button>
        <button type="button" onClick={() => set({ mode: "freeform" })} className={modeBtn(mode === "freeform")}>
          Freeform (24h reply)
        </button>
      </div>

      {mode === "template" ? (
        <>
          <label className={lab}>Template</label>
          <NativeSelect className={inp} value={v("templateName")} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="">Choose an approved template…</option>
            {approved.map((t) => (
              <option key={`${t.name}:${t.language}`} value={t.name}>{t.name} ({t.language})</option>
            ))}
          </NativeSelect>
          {approved.length === 0 && (
            <p className="text-[11px] text-ink-faint mt-1.5">No approved templates — create them in Meta Business Manager.</p>
          )}
          {selected && (
            <>
              <div className="mt-2 rounded-[8px] bg-section border border-border-subtle px-3 py-2 text-[11.5px] text-ink-secondary whitespace-pre-wrap">
                {selected.bodyText}
              </div>
              {tvars.map((val, i) => (
                <div key={i}>
                  <label className={lab}>{`Variable {{${i + 1}}}`}</label>
                  <input
                    className={inp}
                    value={val}
                    onChange={(e) => set({ templateVariables: tvars.map((x, idx) => (idx === i ? e.target.value : x)) })}
                    placeholder={"e.g. {{first_name}}"}
                  />
                </div>
              ))}
              {tvars.length > 0 && (
                <p className="text-[11px] text-ink-faint mt-1.5">Variable values support {"{{first_name}}"}, {"{{company}}"} and custom fields.</p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <FieldHeader label="Message" picker={<VariablePicker targetRef={msgRef} value={msg} onChange={(val) => set({ message: val })} />} />
          <textarea ref={msgRef} className={area} value={msg} onChange={(e) => set({ message: e.target.value })} placeholder={"Hi {{first_name}}, quick question about {{company}}…"} />
          <p className="text-[11px] text-signal-amber-text mt-1.5">
            Freeform only delivers inside the 24-hour window after the lead&apos;s last WhatsApp message — use an approved template for cold outreach.
          </p>
        </>
      )}
    </>
  );
}

// ─── Trigger form (enrollment condition + per-trigger config) ──────────────

function OpportunityStepForm({ set, v }: { set: (patch: Record<string, unknown>) => void; v: (k: string) => string }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  useEffect(() => {
    let alive = true;
    listPipelines().then((p) => { if (alive) setPipelines(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const pipelineId = v("pipelineId");
  const stages = pipelines.find((p) => p.id === pipelineId)?.stages ?? [];
  return (
    <>
      <label className={lab}>Pipeline</label>
      <NativeSelect
        className={inp}
        value={pipelineId}
        onChange={(e) => {
          const p = pipelines.find((x) => x.id === e.target.value);
          set({ pipelineId: e.target.value, pipelineName: p?.name ?? "", stageId: "", stageLabel: "" });
        }}
      >
        <option value="">Select a pipeline…</option>
        {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </NativeSelect>
      <label className={lab}>Move to stage</label>
      <NativeSelect
        className={inp}
        value={v("stageId")}
        disabled={!pipelineId}
        onChange={(e) => {
          const st = stages.find((s) => s.id === e.target.value);
          set({ stageId: e.target.value, stageLabel: st?.label ?? "" });
        }}
      >
        <option value="">Select a stage…</option>
        {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </NativeSelect>
      {!pipelineId && <p className="text-[11px] text-ink-faint mt-1.5">Pick a pipeline first.</p>}
      <p className="text-[11px] text-ink-faint mt-2">
        Moves the lead&apos;s opportunity into this pipeline &amp; stage. Pair it with a Wait step to auto-advance a
        deal after a set time. The lead must have a linked opportunity.
      </p>
    </>
  );
}

function TriggerForm({ d, set, v, orgLevel }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void; v: (k: string) => string; orgLevel?: boolean }) {
  const { statuses } = useLeadStatuses();
  const label = v("label") || (orgLevel ? "Meeting upcoming" : "Lead enters campaign");
  const isOpp = label.startsWith("Opportunity");
  const isSmartView = label === "Matches a smart view";
  const isDateField = label === "Date reaches";
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [views, setViews] = useState<SmartView[]>([]);
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  useEffect(() => {
    if (!isOpp) return;
    let alive = true;
    listPipelines().then((p) => { if (alive) setPipelines(p); }).catch(() => {});
    return () => { alive = false; };
  }, [isOpp]);
  useEffect(() => {
    if (!isSmartView) return;
    let alive = true;
    // Both org- and campaign-scoped saved views are eligible.
    Promise.all([getSmartViews("org"), getSmartViews("campaign")])
      .then(([o, c]) => { if (alive) setViews([...o, ...c]); }).catch(() => {});
    return () => { alive = false; };
  }, [isSmartView]);
  useEffect(() => {
    if (!isDateField) return;
    let alive = true;
    listCustomFields().then((f) => { if (alive) setFields(f.filter((x) => x.fieldType === "date")); }).catch(() => {});
    return () => { alive = false; };
  }, [isDateField]);
  const stagesForPipeline = pipelines.find((p) => p.id === v("pipelineId"))?.stages ?? [];
  return (
    <>
      <label className={lab}>{orgLevel ? "Run this workflow when" : "Enroll leads when"}</label>
      <NativeSelect className={inp} value={label} onChange={(e) => set({ label: e.target.value })}>
        {orgLevel ? (<>
          <option value="Meeting upcoming">A meeting is coming up</option>
          <option value="Meeting booked">A meeting is booked</option>
          <option value="Opportunity created">An opportunity is created</option>
          <option value="Opportunity stage changes">An opportunity changes stage</option>
          <option value="Opportunity won">An opportunity is won</option>
          <option value="Opportunity lost">An opportunity is lost</option>
          <option value="Matches a smart view">A lead matches a smart view</option>
          <option value="Date reaches">A date field is reached</option>
        </>) : (<>
          <option value="Lead enters campaign">Lead enters this campaign</option>
          <option value="Status changes">Lead status changes</option>
          <option value="Tag added">A tag is added</option>
          <option value="Reply received">A reply is received</option>
          <option value="Meeting booked">A meeting is booked</option>
          <option value="Manually added">Manually added by a rep</option>
        </>)}
      </NativeSelect>

      {label === "Meeting upcoming" && (<>
        <label className={lab}>Minutes before the meeting</label>
        <input type="number" min={1} max={10080} className={inp} value={v("minutesBefore") || "15"} onChange={(e) => set({ minutesBefore: Math.max(1, Number(e.target.value) || 15) })} />
        <p className="text-[11px] text-ink-faint mt-1.5">Runs this long before each meeting&apos;s start (the meeting must be linked to a lead). Use <code>{"{{meeting_time}}"}</code> / <code>{"{{meeting_title}}"}</code> in messages.</p>
      </>)}
      {isOpp && (<>
        <label className={lab}>Pipeline</label>
        <NativeSelect className={inp} value={v("pipelineId")} onChange={(e) => set({ pipelineId: e.target.value, ...(e.target.value !== v("pipelineId") ? { toStageId: "" } : {}) })}>
          <option value="">Any pipeline</option>
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
        {label === "Opportunity stage changes" && (<>
          <label className={lab}>Moves to stage</label>
          <NativeSelect className={inp} value={v("toStageId")} onChange={(e) => set({ toStageId: e.target.value })} disabled={!v("pipelineId")}>
            <option value="">Any stage</option>
            {stagesForPipeline.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </NativeSelect>
          {!v("pipelineId") && <p className="text-[11px] text-ink-faint mt-1.5">Pick a pipeline first to choose a target stage.</p>}
        </>)}
        <p className="text-[11px] text-ink-faint mt-2">Runs for the opportunity&apos;s source lead. Leave pipeline as “Any” to match every pipeline.</p>
      </>)}

      {isSmartView && (<>
        <label className={lab}>Smart view</label>
        <NativeSelect className={inp} value={v("viewId")} onChange={(e) => set({ viewId: e.target.value })}>
          <option value="">Select a view…</option>
          {views.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}{sv.scope === "campaign" ? " (campaign)" : ""}</option>)}
        </NativeSelect>
        <p className="text-[11px] text-ink-faint mt-1.5">Every lead matching this saved view is enrolled — new matches enroll automatically (checked every few minutes). Already-enrolled leads aren&apos;t re-enrolled.</p>
      </>)}

      {isDateField && (<>
        <label className={lab}>Date field</label>
        <NativeSelect className={inp} value={v("fieldKey")} onChange={(e) => set({ fieldKey: e.target.value })}>
          <option value="">Select a date field…</option>
          <option value="nextDate">Next scheduled date</option>
          {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </NativeSelect>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className={lab}>Days</label>
            <input type="number" min={0} max={3650} className={inp} value={v("offsetDays") || "0"} onChange={(e) => set({ offsetDays: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div>
            <label className={lab}>When</label>
            <NativeSelect className={inp} value={v("direction") || "before"} onChange={(e) => set({ direction: e.target.value })}>
              <option value="before">before the date</option>
              <option value="after">after the date</option>
            </NativeSelect>
          </div>
        </div>
        <p className="text-[11px] text-ink-faint mt-1.5">Enrolls a lead once, on the day that many days before/after the field&apos;s date (checked hourly). Only date-type custom fields appear here.</p>
      </>)}

      {label === "Status changes" && (<>
        <label className={lab}>Status changes to</label>
        <NativeSelect className={inp} value={v("statusTo")} onChange={(e) => set({ statusTo: e.target.value })}>
          <option value="">Any status</option>
          {statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </NativeSelect>
        <p className="text-[11px] text-ink-faint mt-1.5">Only enrolls when the lead&apos;s status changes to this (or any).</p>
      </>)}

      {label === "Tag added" && (<>
        <label className={lab}>Tag</label>
        <input className={inp} value={v("tag")} onChange={(e) => set({ tag: e.target.value })} placeholder="Any tag" />
        <p className="text-[11px] text-ink-faint mt-1.5">Leave blank to enroll when any tag is added.</p>
      </>)}

      {label === "Reply received" && (
        <p className="text-[11px] text-ink-faint mt-2">Enrolls when the lead replies by email or SMS.</p>
      )}
      {label === "Meeting booked" && (
        <p className="text-[11px] text-ink-faint mt-2">Enrolls when a Calendly meeting is booked for the lead.</p>
      )}
      {label === "Manually added" && (
        <p className="text-[11px] text-ink-faint mt-2">Enroll leads by hand from the campaign / lead view.</p>
      )}

      <label className={lab}>Description</label>
      <input className={inp} value={v("sub")} onChange={(e) => set({ sub: e.target.value })} placeholder="Optional note" />
    </>
  );
}
