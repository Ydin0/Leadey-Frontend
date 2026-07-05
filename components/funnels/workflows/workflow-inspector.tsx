"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X, Loader2, BookmarkPlus, Check } from "lucide-react";
import type { Workflow, WorkflowNode, WorkflowSettings, WorkflowStatus } from "@/lib/types/workflow";
import { NativeSelect } from "@/components/ui/native-select";
import { VariablePicker } from "./variable-picker";
import { listEmailAccounts } from "@/lib/api/email-accounts";
import type { EmailAccount } from "@/lib/types/email-accounts";
import { getPhoneLines } from "@/lib/api/phone-lines";
import type { PhoneLine } from "@/lib/types/calling";
import { listTemplates, createTemplate } from "@/lib/api/templates";
import type { Template } from "@/lib/types/template";
import {
  listWhatsappSenders,
  listWhatsappContentTemplates,
  getWhatsappSettings,
  type WhatsappSender,
  type WhatsappContentTemplate,
  type WhatsappSettings,
} from "@/lib/api/whatsapp";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
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
  onRename: (name: string) => void;
  onStatus: (status: WorkflowStatus) => void;
  onSettings: (patch: WorkflowSettings) => void;
}

export function WorkflowInspector(p: InspectorProps) {
  if (!p.node) return <SettingsPanel {...p} />;
  return <NodePanel {...p} node={p.node} />;
}

function NodePanel({ node, onNodeData, onDeleteNode, onDeselect }: InspectorProps & { node: WorkflowNode }) {
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

      {node.type === "trigger" && <TriggerForm d={d} set={set} v={v} />}

      {node.type === "email" && <EmailStepForm d={d} set={set} />}

      {node.type === "sms" && <SmsStepForm d={d} set={set} />}

      {node.type === "whatsapp" && <WhatsappStepForm d={d} set={set} />}

      {node.type === "linkedin" && (<>
        <label className={lab}>Action</label>
        <NativeSelect className={inp} value={v("ltype")} onChange={(e) => set({ ltype: e.target.value })}>
          <option value="connection">Connection request</option>
          <option value="message">Direct message</option>
          <option value="inmail">InMail</option>
          <option value="visit">Profile visit</option>
        </NativeSelect>
        <label className={lab}>Message</label>
        <textarea className={area} value={v("message")} onChange={(e) => set({ message: e.target.value })} />
        <p className="text-[11px] text-ink-faint mt-1.5">Creates an assigned task for a rep to action.</p>
      </>)}

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

function EmailStepForm({ d, set }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void }) {
  const v = (k: string) => (d[k] != null ? String(d[k]) : "");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listEmailAccounts().then(setAccounts).catch(() => {});
    listTemplates("email").then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (t) set({ subject: t.subject || "", body: t.body || "" });
  }

  return (
    <>
      <label className={lab}>From</label>
      <NativeSelect className={inp} value={v("accountId")} onChange={(e) => {
        const id = e.target.value; const acc = accounts.find((a) => a.id === id);
        set({ accountId: id, from: acc?.email || "" });
      }}>
        <option value="">Default mailbox</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.fromName ? `${a.fromName} · ${a.email}` : a.email}</option>)}
      </NativeSelect>
      {accounts.length === 0 && <p className="text-[11px] text-ink-faint mt-1.5">No mailbox connected — add one in Settings → Email.</p>}

      <label className={lab}>Template</label>
      <NativeSelect className={inp} value={tplId} onChange={(e) => applyTemplate(e.target.value)}>
        <option value="">Start from scratch…</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </NativeSelect>

      <FieldHeader label="Subject" picker={<VariablePicker targetRef={subjectRef} value={v("subject")} onChange={(val) => set({ subject: val })} />} />
      <input ref={subjectRef} className={inp} value={v("subject")} onChange={(e) => set({ subject: e.target.value })} placeholder="Quick question, {{first_name}}" />

      <FieldHeader label="Body" picker={<VariablePicker targetRef={bodyRef} value={v("body")} onChange={(val) => set({ body: val })} />} />
      <textarea ref={bodyRef} className={area} value={v("body")} onChange={(e) => set({ body: e.target.value })} />

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
      <label className={lab}>From number</label>
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
  const [senders, setSenders] = useState<WhatsappSender[]>([]);
  const [templates, setTemplates] = useState<WhatsappContentTemplate[]>([]);
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const mode = v("mode") || "template";

  useEffect(() => {
    listWhatsappSenders().then(setSenders).catch(() => {});
    listWhatsappContentTemplates().then(setTemplates).catch(() => {});
    getWhatsappSettings().then(setSettings).catch(() => {});
  }, []);

  const online = senders.filter((s) => s.status === "online");
  const selected = templates.find((t) => t.sid === v("contentSid")) || null;
  // {{1}}-style placeholder slots in the selected template body.
  const slots = selected
    ? [...new Set([...selected.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]))].sort((a, b) => Number(a) - Number(b))
    : [];
  const vars =
    d.contentVariables && typeof d.contentVariables === "object" && !Array.isArray(d.contentVariables)
      ? (d.contentVariables as Record<string, string>)
      : {};

  function pickTemplate(sid: string) {
    const t = templates.find((x) => x.sid === sid);
    set({ contentSid: sid, contentName: t?.name || "", contentBody: t?.body || "", contentVariables: {} });
  }

  const msg = v("message");
  const modeBtn = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
      active ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <>
      <label className={lab}>From number</label>
      <NativeSelect className={inp} value={v("lineId")} onChange={(e) => set({ lineId: e.target.value })}>
        <option value="">Auto (first online sender)</option>
        {online.map((s) => (
          <option key={s.id} value={s.lineId || s.id}>
            {s.lineName ? `${s.lineName} · ${s.number}` : s.number}
          </option>
        ))}
      </NativeSelect>
      {settings?.sandbox ? (
        <p className="text-[11px] text-ink-faint mt-1.5">Sandbox mode — sends use the shared Twilio sandbox number.</p>
      ) : online.length === 0 ? (
        <p className="text-[11px] text-ink-faint mt-1.5">No WhatsApp sender online — register one in Settings → WhatsApp.</p>
      ) : null}

      <label className={lab}>Message type</label>
      <div className="flex items-center bg-section rounded-full p-0.5 border border-border-subtle">
        <button type="button" onClick={() => set({ mode: "template" })} className={modeBtn(mode === "template")}>
          Approved template
        </button>
        <button type="button" onClick={() => set({ mode: "freeform" })} className={modeBtn(mode === "freeform")}>
          Freeform (24h window)
        </button>
      </div>

      {mode === "template" ? (
        <>
          <label className={lab}>Template</label>
          <NativeSelect className={inp} value={v("contentSid")} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="">Choose an approved template…</option>
            {templates.map((t) => (
              <option key={t.sid} value={t.sid} disabled={t.approvalStatus !== "approved"}>
                {t.name}
                {t.approvalStatus !== "approved" ? ` (${t.approvalStatus})` : ""}
              </option>
            ))}
          </NativeSelect>
          {templates.length === 0 && (
            <p className="text-[11px] text-ink-faint mt-1.5">No templates yet — create one in Settings → WhatsApp.</p>
          )}
          {selected && (
            <div className="mt-2 rounded-[8px] bg-section border border-border-subtle px-3 py-2 text-[11.5px] text-ink-secondary whitespace-pre-wrap">
              {selected.body}
            </div>
          )}
          {slots.map((slot) => (
            <div key={slot}>
              <label className={lab}>{`Variable {{${slot}}}`}</label>
              <input
                className={inp}
                value={vars[slot] || ""}
                onChange={(e) => set({ contentVariables: { ...vars, [slot]: e.target.value } })}
                placeholder={`e.g. {{first_name}}`}
              />
            </div>
          ))}
          {slots.length > 0 && (
            <p className="text-[11px] text-ink-faint mt-1.5">
              Variable values support {"{{first_name}}"}, {"{{company}}"} and custom fields.
            </p>
          )}
        </>
      ) : (
        <>
          <FieldHeader label="Message" picker={<VariablePicker targetRef={msgRef} value={msg} onChange={(val) => set({ message: val })} />} />
          <textarea ref={msgRef} className={area} value={msg} onChange={(e) => set({ message: e.target.value })} />
          <p className="text-[11px] text-signal-amber-text mt-1.5">
            Freeform WhatsApp messages only deliver inside the 24-hour window after the lead&apos;s last WhatsApp
            message — outside it this step fails. Use an approved template for cold outreach.
          </p>
        </>
      )}
    </>
  );
}

// ─── Trigger form (enrollment condition + per-trigger config) ──────────────

function TriggerForm({ d, set, v }: { d: Record<string, unknown>; set: (patch: Record<string, unknown>) => void; v: (k: string) => string }) {
  const { statuses } = useLeadStatuses();
  const label = v("label") || "Lead enters campaign";
  return (
    <>
      <label className={lab}>Enroll leads when</label>
      <NativeSelect className={inp} value={label} onChange={(e) => set({ label: e.target.value })}>
        <option value="Lead enters campaign">Lead enters this campaign</option>
        <option value="Status changes">Lead status changes</option>
        <option value="Tag added">A tag is added</option>
        <option value="Reply received">A reply is received</option>
        <option value="Meeting booked">A meeting is booked</option>
        <option value="Manually added">Manually added by a rep</option>
      </NativeSelect>

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
