"use client";

import { Trash2, X } from "lucide-react";
import type { Workflow, WorkflowNode, WorkflowSettings, WorkflowStatus } from "@/lib/types/workflow";
import { NativeSelect } from "@/components/ui/native-select";
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

      {node.type === "trigger" && (<>
        <label className={lab}>Enroll leads when</label>
        <NativeSelect className={inp} value={v("label")} onChange={(e) => set({ label: e.target.value })}>
          <option value="Lead enters campaign">Lead enters this campaign</option>
          <option value="Status changes">Lead status changes</option>
          <option value="Tag added">A tag is added</option>
          <option value="Reply received">A reply is received</option>
          <option value="Manually added">Manually added by a rep</option>
        </NativeSelect>
        <label className={lab}>Description</label>
        <input className={inp} value={v("sub")} onChange={(e) => set({ sub: e.target.value })} placeholder="Optional note" />
      </>)}

      {node.type === "email" && (<>
        <label className={lab}>From</label>
        <input className={inp} value={v("from")} onChange={(e) => set({ from: e.target.value })} placeholder="connected mailbox (e.g. you@co.com)" />
        <label className={lab}>Subject</label>
        <input className={inp} value={v("subject")} onChange={(e) => set({ subject: e.target.value })} placeholder="Quick question, {firstName}" />
        <label className={lab}>Body</label>
        <textarea className={area} value={v("body")} onChange={(e) => set({ body: e.target.value })} />
        <p className="text-[11px] text-ink-faint mt-1.5">Use {"{firstName}"}, {"{company}"} for personalization.</p>
      </>)}

      {node.type === "sms" && (<>
        <label className={lab}>Message</label>
        <textarea className={area} value={v("message")} onChange={(e) => set({ message: e.target.value })} />
        <p className="text-[11px] text-ink-faint mt-1.5">{v("message").length} chars · {Math.max(1, Math.ceil(v("message").length / 160))} segment(s)</p>
      </>)}

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
