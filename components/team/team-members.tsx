"use client";

import React from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Icon } from "./icon";
import { Avatar, StatusDot } from "./team-shared";
import { useTeamData } from "@/lib/team/team-data-context";
import {
  CH_IDS, CH_MAP, ROLE_TARGETS, departmentColor, type Member, type Targets, type ChannelId,
} from "@/lib/team/team-data";

export function KpiStepper({ value, onChange, step = 5 }: {
  value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - step))}><Icon name="minus" size={13} /></button>
      <input type="number" value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))} />
      <button type="button" onClick={() => onChange(value + step)}><Icon name="plus" size={13} /></button>
    </div>
  );
}

export interface MemberFormData {
  name: string; email: string; role: string; pod: string; targets: Targets;
}

export function MemberModal({ mode, member, seatUsage, onClose, onSave }: {
  mode: "add" | "edit"; member: Member | null;
  seatUsage: { used: number; included: number };
  onClose: () => void; onSave: (data: MemberFormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { departments } = useTeamData();
  const [name, setName] = React.useState(member ? member.name : "");
  const [email, setEmail] = React.useState(member ? (member.email || "") : "");
  const [role, setRole] = React.useState(member ? member.role : "SDR");
  const [pod, setPod] = React.useState(member ? member.pod : (departments[0]?.name || "Enterprise"));
  const [targets, setTargets] = React.useState<Targets>(member ? { ...member.targets } : { ...ROLE_TARGETS.SDR });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editing = mode === "edit";
  const seatsFull = seatUsage.used >= seatUsage.included;

  function pickRole(r: string) {
    setRole(r);
    if (!editing) setTargets({ ...ROLE_TARGETS[r] });
  }
  const setT = (ch: ChannelId, v: number) => setTargets((t) => ({ ...t, [ch]: v }));
  const dailyTotal = CH_IDS.reduce((a, ch) => a + (targets[ch] || 0), 0);
  const valid = editing
    ? true
    : name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && !seatsFull;

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await onSave({ name: name.trim(), email, role, pod, targets });
    if (res.ok) onClose();
    else { setError(res.error || "Failed to save."); setSaving(false); }
  }

  return (
    <div className="team-scrim team-root" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="row" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--section)", justifyContent: "center" }}>
              <Icon name={editing ? "sliders-horizontal" : "user-plus"} size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{editing ? "Edit KPI targets" : "Add team member"}</div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{editing ? member!.name : "Invite a rep and set their daily goals"}</div>
            </div>
          </div>
          <button onClick={onClose} className="row" style={{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", color: "var(--fg-muted)" }}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          {!editing && (
            <>
              {/* Seat usage */}
              <div className="between" style={{ background: "var(--page)", border: `1px solid ${seatsFull ? "var(--signal-red-text)" : "var(--border-subtle)"}`, borderRadius: 10, padding: "10px 14px" }}>
                <span className="row" style={{ gap: 8, fontSize: 12, color: "var(--fg2)" }}>
                  <Icon name="users-round" size={14} style={{ color: "var(--fg-muted)" }} />
                  Seats
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: seatsFull ? "var(--signal-red-text)" : "var(--fg1)" }}>
                  {seatUsage.used} / {seatUsage.included} used
                </span>
              </div>
              {seatsFull && (
                <div style={{ fontSize: 11, color: "var(--signal-red-text)", marginTop: -6 }}>
                  All seats are in use. Upgrade your plan to invite more members.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Full name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Avery" autoFocus disabled={seatsFull} /></div>
                <div><label className="lbl">Work email</label><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@leadey.com" disabled={seatsFull} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="lbl">Role</label>
                  <NativeSelect className="field" value={role} onChange={(e) => pickRole(e.target.value)}>
                    {Object.keys(ROLE_TARGETS).map((r) => <option key={r} value={r}>{r}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label className="lbl">Department</label>
                  <NativeSelect className="field" value={pod} onChange={(e) => setPod(e.target.value)}>
                    {departments.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </NativeSelect>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="between" style={{ marginBottom: 10, gap: 12 }}>
              <label className="lbl" style={{ margin: 0, whiteSpace: "nowrap" }}>Daily KPI targets</label>
              <span style={{ fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>{dailyTotal} touches / day</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {CH_IDS.map((ch) => {
                const c = CH_MAP[ch];
                return (
                  <div key={ch} className="between" style={{ background: "var(--page)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "10px 12px" }}>
                    <span className="row" style={{ gap: 9, fontSize: 12, color: "var(--fg2)" }}>
                      <span className="row" style={{ width: 26, height: 26, borderRadius: 7, justifyContent: "center", background: c.color + "1f" }}><Icon name={c.icon} size={14} style={{ color: c.color }} /></span>
                      {c.label}
                    </span>
                    <KpiStepper value={targets[ch] || 0} onChange={(v) => setT(ch, v)} />
                  </div>
                );
              })}
            </div>
            {!editing && <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 10 }}>Targets pre-fill from the {role} role — adjust any of them for this rep.</div>}
          </div>
        </div>

        <div className="between" style={{ gap: 10, padding: "16px 22px", borderTop: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: 11, color: "var(--signal-red-text)" }}>{error || ""}</span>
          <div className="row" style={{ gap: 10 }}>
            <button className="pill pill-soft" onClick={onClose}>Cancel</button>
            <button className="pill pill-primary" style={{ opacity: valid && !saving ? 1 : 0.45, pointerEvents: valid && !saving ? "auto" : "none" }}
              onClick={submit}>
              {saving ? <Icon name="activity" size={13} /> : <Icon name={editing ? "check" : "user-plus"} size={13} />}
              {editing ? "Save targets" : "Send invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamMembers({ onPickRep, onEdit }: {
  onPickRep: (id: string) => void; onEdit: (id: string) => void;
}) {
  const { members, departments } = useTeamData();
  return (
    <div className="fade card" style={{ overflow: "hidden", padding: 0 }}>
      <table className="tt">
        <thead>
          <tr>
            <th>Member</th>
            <th>Department</th>
            <th>Status</th>
            <th style={{ textAlign: "center" }}>Calls</th>
            <th style={{ textAlign: "center" }}>Emails</th>
            <th style={{ textAlign: "center" }}>SMS</th>
            <th style={{ textAlign: "center" }}>LinkedIn</th>
            <th style={{ textAlign: "right" }}>Daily total</th>
            <th style={{ width: 44 }}></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const daily = CH_IDS.reduce((a, ch) => a + m.targets[ch], 0);
            const drillable = m.status !== "pending";
            return (
              <tr key={m.id} className={drillable ? "click" : ""} onClick={() => drillable && onPickRep(m.id)}>
                <td>
                  <div className="row" style={{ gap: 11 }}>
                    <Avatar name={m.name} pod={m.pod} size={34} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 1 }}>{m.role}{m.email ? " · " + m.email : ""}</div>
                    </div>
                  </div>
                </td>
                <td><span className="row" style={{ gap: 7, fontSize: 11.5, color: "var(--fg2)" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: departmentColor(m.pod, departments) }}></span>{m.pod}</span></td>
                <td><StatusDot status={m.status} /></td>
                {CH_IDS.map((ch) => (
                  <td key={ch} style={{ textAlign: "center", color: "var(--fg2)", fontWeight: 500 }}>{m.targets[ch]}</td>
                ))}
                <td style={{ textAlign: "right", fontWeight: 600 }}>{daily}</td>
                <td onClick={(e) => { e.stopPropagation(); onEdit(m.id); }}>
                  <button className="row" style={{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", color: "var(--fg-muted)" }} title="Edit targets"><Icon name="sliders-horizontal" size={15} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
