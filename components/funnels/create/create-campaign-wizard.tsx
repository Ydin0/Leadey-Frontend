"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ChevronLeft, Save, X, Lock, Globe, Check, Filter, List, ChevronDown, Plus,
  Users, Upload, Phone, Mail, Linkedin, CheckSquare, Minus, Trash2, Flag, Zap,
  User, Clock, CalendarCheck, CircleDot, Database, Briefcase, Building2,
  Sparkles, Pencil, Rocket, ArrowLeft, ArrowRight, UserRound, Info, Loader2,
} from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberMultiSelect } from "@/components/shared/member-multi-select";
import { MultiSelectPills } from "@/components/shared/multi-select-pills";
import { getDepartments } from "@/lib/api/team";
import { useTeamMembers } from "@/hooks/use-team-members";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { listEmailAccounts } from "@/lib/api/email-accounts";
import { listFunnels, createFunnel, updateFunnel, type CreateFunnelPayload } from "@/lib/api/funnels";
import { cn } from "@/lib/utils";
import type { EmailAccount } from "@/lib/types/email-accounts";
import type { Funnel, FunnelChannel, CampaignAudienceCondition } from "@/lib/types/funnel";

// ── Static config ────────────────────────────────────────────────────────────
type StepId = "details" | "audience" | "sequence" | "email" | "review";

const STEP_META: Record<StepId, [string, string]> = {
  details: ["Campaign details", "Name, visibility & team"],
  audience: ["Audience", "Who enters this campaign"],
  sequence: ["Sequence", "Steps & timing"],
  email: ["Email automation", "Mailboxes & sending"],
  review: ["Review & launch", "Confirm and go live"],
};

type FieldDef = {
  label: string; icon: typeof User; op: string;
  type: "rep" | "enum"; options?: string[]; factor: number;
};
const FIELDS: Record<string, FieldDef> = {
  owner: { label: "Lead owner", icon: User, op: "is", type: "rep", factor: 0.34 },
  meetings: { label: "Meetings booked", icon: CalendarCheck, op: "is", type: "enum", options: ["0", "1 or more", "2 or more"], factor: 0.7 },
  status: { label: "Lead status", icon: CircleDot, op: "is", type: "enum", options: ["New", "Working", "Qualified", "Customer", "Lost"], factor: 0.42 },
  source: { label: "Source", icon: Database, op: "is", type: "enum", options: ["CSV Import", "Apollo", "Crunchbase", "HubSpot", "Inbound"], factor: 0.5 },
  title: { label: "Job title", icon: Briefcase, op: "contains", type: "enum", options: ["Founder / CEO", "VP Sales", "RevOps", "CTO / VP Eng", "Marketing"], factor: 0.45 },
  size: { label: "Company size", icon: Building2, op: "is", type: "enum", options: ["1–10", "11–50", "51–200", "201–1k", "1k+"], factor: 0.55 },
  signal: { label: "Buying signal", icon: Sparkles, op: "is", type: "enum", options: ["Hiring", "Funding", "Tech adoption", "Job change"], factor: 0.3 },
  activity: { label: "Last activity", icon: Clock, op: "within", type: "enum", options: ["7 days", "30 days", "90 days", "Any time"], factor: 0.6 },
};
const FIELD_ORDER = ["owner", "meetings", "status", "source", "title", "size", "signal", "activity"];

const CH: Record<FunnelChannel, { label: string; icon: typeof Mail; color: string; placeholder: string }> = {
  call: { label: "Cold call", icon: Phone, color: "text-signal-green-text", placeholder: "Opening hook / script reference" },
  email: { label: "Email", icon: Mail, color: "text-ink-muted", placeholder: "Subject line" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-linkedin", placeholder: "Connection note or message" },
  task: { label: "Manual task", icon: CheckSquare, color: "text-ink-secondary", placeholder: "What should the rep do?" },
  whatsapp: { label: "WhatsApp", icon: CheckSquare, color: "text-signal-green-text", placeholder: "Message" },
  sms: { label: "SMS", icon: CheckSquare, color: "text-signal-green-text", placeholder: "Message" },
};
const ADD_CHANNELS: FunnelChannel[] = ["call", "email", "linkedin", "task"];

const DAY_DEFS: [string, string, string][] = [
  ["mon", "Mo", "Monday"], ["tue", "Tu", "Tuesday"], ["wed", "We", "Wednesday"],
  ["thu", "Th", "Thursday"], ["fri", "Fr", "Friday"], ["sat", "Sa", "Saturday"], ["sun", "Su", "Sunday"],
];

let SID = 100;

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("relative w-[38px] h-[22px] rounded-full transition-colors shrink-0", on ? "bg-accent" : "bg-section")}
    >
      <span className={cn("absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

interface WizState {
  step: StepId;
  visited: Record<string, boolean>;
  name: string;
  desc: string;
  visibility: "private" | "public";
  members: string[]; // assigned ids excluding owner
  departments: string[]; // department names with live access
  audMode: "dynamic" | "static";
  matchAll: boolean;
  conditions: CampaignAudienceCondition[];
  autoEnroll: boolean;
  steps: { id: string; ch: FunnelChannel; day: number; body: string }[];
  exit: { reply: boolean; meeting: boolean; opp: boolean };
  emailAuto: boolean;
  mailboxSel: Record<string, boolean>;
  mailboxLimit: Record<string, number>;
  dailyCap: number;
  ramp: boolean;
  days: Record<string, boolean>;
  sendStart: string;
  sendEnd: string;
  track: { opens: boolean; clicks: boolean; unsub: boolean };
  launchMode: "launch" | "draft";
  menu: string | null;
}

interface CreateCampaignWizardProps {
  /** "create" (default) builds a new campaign; "edit" pre-fills from `funnel`
   *  and saves via PATCH. */
  mode?: "create" | "edit";
  funnel?: Funnel;
}

/** Build the wizard's starting state — defaults for create, or pre-filled from
 *  an existing campaign for edit so the whole flow is identical either way. */
function initialStateFor(funnel?: Funnel): WizState {
  const base: WizState = {
    step: "details",
    visited: { details: true },
    name: "",
    desc: "",
    visibility: "private",
    members: [],
    departments: [],
    audMode: "dynamic",
    matchAll: true,
    conditions: [{ id: "k1", field: "meetings", value: "0" }],
    autoEnroll: true,
    steps: [
      { id: "s1", ch: "call", day: 0, body: "" },
      { id: "s2", ch: "email", day: 1, body: "" },
      { id: "s3", ch: "linkedin", day: 3, body: "" },
    ],
    exit: { reply: true, meeting: true, opp: false },
    emailAuto: true,
    mailboxSel: {},
    mailboxLimit: {},
    dailyCap: 80,
    ramp: true,
    days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
    sendStart: "09:00",
    sendEnd: "17:00",
    track: { opens: true, clicks: true, unsub: true },
    launchMode: "launch",
    menu: null,
  };
  if (!funnel) return base;

  const cfg = funnel.config ?? {};
  const aud = cfg.audience;
  const ex = cfg.exit;
  const em = cfg.emailAutomation;
  const mailboxSel: Record<string, boolean> = {};
  const mailboxLimit: Record<string, number> = {};
  if (em?.mailboxIds) for (const id of em.mailboxIds) mailboxSel[id] = true;
  if (em?.perMailboxLimits) for (const [id, v] of Object.entries(em.perMailboxLimits)) mailboxLimit[id] = v;

  return {
    ...base,
    visited: { details: true, audience: true, sequence: true, email: true, review: true },
    name: funnel.name,
    desc: funnel.description,
    visibility: funnel.visibility ?? "private",
    members: funnel.members.filter((m) => m.role !== "owner").map((m) => m.teamMemberId),
    departments: Array.isArray(cfg.departmentAccess) ? cfg.departmentAccess : [],
    audMode: aud?.mode ?? "dynamic",
    matchAll: aud?.matchAll ?? true,
    conditions: aud?.conditions?.length ? aud.conditions : base.conditions,
    autoEnroll: aud?.autoEnroll ?? true,
    // Mirror the campaign's REAL steps — including none. Falling back to the
    // starter sequence here silently re-added steps to sequence-less
    // campaigns every time they were edited.
    steps: funnel.steps.map((st, i) => ({ id: st.id || `s${i + 1}`, ch: st.channel, day: st.dayOffset, body: st.subject || st.action || "" })),
    exit: ex ?? base.exit,
    emailAuto: em?.enabled ?? true,
    mailboxSel,
    mailboxLimit,
    dailyCap: em?.dailyCap ?? 80,
    ramp: em?.ramp ?? true,
    days: em?.days ?? base.days,
    sendStart: em?.sendStart ?? "09:00",
    sendEnd: em?.sendEnd ?? "17:00",
    track: em?.tracking ?? base.track,
  };
}

export function CreateCampaignWizard({ mode = "create", funnel }: CreateCampaignWizardProps = {}) {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const { userId } = useAuth();
  const { members: team, resolveMember } = useTeamMembers();
  const isEdit = mode === "edit";
  const funnelId = funnel?.id;

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [leadBase, setLeadBase] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [s, setS] = useState<WizState>(() => initialStateFor(funnel));
  const patch = (u: Partial<WizState>) => setS((p) => ({ ...p, ...u }));

  // Load real mailboxes + a real lead-count base for the live estimate.
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const [accts, funnels, depts] = await Promise.all([
          listEmailAccounts(),
          listFunnels(),
          getDepartments().catch(() => []),
        ]);
        if (cancelled) return;
        setAccounts(accts);
        setDeptOptions(depts.map((d) => d.name));
        // Default-select the connected (active) mailboxes.
        setS((p) => {
          const sel: Record<string, boolean> = { ...p.mailboxSel };
          const lim: Record<string, number> = { ...p.mailboxLimit };
          for (const a of accts) {
            // In create mode default-select connected mailboxes; in edit mode
            // leave unknown accounts unselected (the saved selection wins).
            if (!(a.id in sel)) sel[a.id] = isEdit ? false : a.status === "active";
            if (!(a.id in lim)) lim[a.id] = 50;
          }
          return { ...p, mailboxSel: sel, mailboxLimit: lim };
        });
        setLeadBase(funnels.reduce((acc, f) => acc + (f.metrics?.total ?? 0), 0));
      } catch {
        /* degrade gracefully — mailboxes empty, estimate falls back */
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthReady, isEdit]);

  // Close any open menu on outside click.
  useEffect(() => {
    if (!s.menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-menu]")) patch({ menu: null });
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [s.menu]);

  // Owner = current user; reps available = whole team.
  const ownerId = userId ?? "owner";
  const ownerName = resolveMember(ownerId)?.name ?? "You";
  const reps = useMemo(
    () => (team.length ? team : [{ id: ownerId, name: ownerName, email: "", role: "", imageUrl: null }]),
    [team, ownerId, ownerName],
  );
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? resolveMember(id)?.name ?? "Unknown";

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasEmailStep = s.steps.some((x) => x.ch === "email");
  const order: StepId[] = useMemo(() => {
    const base: StepId[] = ["details", "audience", "sequence"];
    if (hasEmailStep) base.push("email");
    base.push("review");
    return base;
  }, [hasEmailStep]);
  const curIdx = order.indexOf(s.step);

  const matchEstimate = useMemo(() => {
    const base = leadBase || 1000;
    if (!s.conditions.length) return base;
    const factors = s.conditions.map((c) => FIELDS[c.field]?.factor ?? 0.5);
    const frac = s.matchAll
      ? factors.reduce((a, f) => a * f, 1)
      : 1 - factors.reduce((a, f) => a * (1 - f), 1);
    return Math.max(8, Math.round(base * frac));
  }, [s.conditions, s.matchAll, leadBase]);

  const go = (id: StepId) => setS((p) => ({ ...p, step: id, visited: { ...p.visited, [id]: true }, menu: null }));
  const next = () => {
    if (s.step === "review") return void launch();
    if (curIdx < order.length - 1) go(order[curIdx + 1]);
  };
  const back = () => { if (curIdx > 0) go(order[curIdx - 1]); };

  const selectedMailboxes = accounts.filter((a) => s.mailboxSel[a.id]);
  const capacity = selectedMailboxes.reduce((a, m) => a + (s.mailboxLimit[m.id] ?? 50), 0);
  const emailStepN = s.steps.filter((x) => x.ch === "email").length;
  const nameOk = s.name.trim().length > 0;

  // ── Submit → create the campaign, or save edits to an existing one ───────────
  const launch = useCallback(async () => {
    if (launching) return;
    setLaunching(true);
    setError(null);
    try {
      const steps = s.steps.map((st) => ({
        channel: st.ch,
        label: CH[st.ch].label,
        dayOffset: st.day,
        ...(st.ch === "email" && st.body.trim() ? { subject: st.body.trim() } : {}),
        ...(st.ch !== "email" && st.body.trim() ? { action: st.body.trim() } : {}),
      }));
      const audience = {
        mode: s.audMode,
        matchAll: s.matchAll,
        conditions: s.conditions,
        autoEnroll: s.autoEnroll,
        matchEstimate,
      };
      const emailAutomation = hasEmailStep
        ? {
            enabled: s.emailAuto,
            mailboxIds: selectedMailboxes.map((m) => m.id),
            perMailboxLimits: Object.fromEntries(selectedMailboxes.map((m) => [m.id, s.mailboxLimit[m.id] ?? 50])),
            dailyCap: s.dailyCap,
            ramp: s.ramp,
            days: s.days,
            sendStart: s.sendStart,
            sendEnd: s.sendEnd,
            tracking: s.track,
          }
        : undefined;

      if (isEdit && funnelId) {
        // Edit preserves the current status — status is changed from the
        // campaign header (Activate/Pause), not the wizard.
        await updateFunnel(funnelId, {
          name: s.name.trim(),
          description: s.desc.trim(),
          visibility: s.visibility,
          steps,
          members: s.members,
          departments: s.departments,
          audience,
          exit: s.exit,
          ...(emailAutomation ? { emailAutomation } : {}),
        });
        setCreatedId(funnelId);
      } else {
        const payload: CreateFunnelPayload = {
          name: s.name.trim(),
          description: s.desc.trim(),
          status: s.launchMode === "launch" ? "active" : "draft",
          visibility: s.visibility,
          steps,
          members: s.members,
          departments: s.departments,
          audience,
          exit: s.exit,
          ...(emailAutomation ? { emailAutomation } : {}),
        };
        const created = await createFunnel(payload);
        setCreatedId(created.id);
      }
      setLaunched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to save changes" : "Failed to create campaign");
    } finally {
      setLaunching(false);
    }
  }, [launching, s, matchEstimate, hasEmailStep, selectedMailboxes, isEdit, funnelId]);
  const toggleExit = (k: keyof WizState["exit"]) => setS((p) => ({ ...p, exit: { ...p.exit, [k]: !p.exit[k] } }));
  const toggleTrack = (k: keyof WizState["track"]) => setS((p) => ({ ...p, track: { ...p.track, [k]: !p.track[k] } }));
  const toggleDay = (k: string) => setS((p) => ({ ...p, days: { ...p.days, [k]: !p.days[k] } }));

  const usedFields = s.conditions.map((c) => c.field);
  const addableFields = FIELD_ORDER.filter((f) => !usedFields.includes(f));

  const titleDisplay = s.name.trim() || "Untitled campaign";
  const cancelHref = isEdit && funnelId ? `/dashboard/funnels/${funnelId}` : "/dashboard/funnels";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex flex-col bg-page text-ink" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header className="flex items-center gap-3.5 h-[60px] shrink-0 border-b border-border-subtle px-5">
        <div className="flex items-center gap-2.5 text-ink">
          <svg width="20" height="20" viewBox="0 0 301 309" fill="currentColor" className="shrink-0">
            <path d="M66.2697 0L300.593 125.175V183.214L66.2697 308.389H0L119.978 162.424H249.917V145.964H119.978L0 0H66.2697Z" />
          </svg>
          <div className="w-px h-[22px] bg-border-default" />
          <button onClick={() => router.push("/dashboard/funnels")} className="flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink-secondary transition-colors">
            <ChevronLeft size={14} /> Campaigns
          </button>
          <span className="text-[13px] text-ink-faint">/</span>
          <span className="text-[13px] font-semibold truncate max-w-[280px]">{titleDisplay}</span>
        </div>
        <div className="grow" />
        {isEdit ? (
          <button
            onClick={() => void launch()}
            disabled={!nameOk || launching}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink text-on-ink px-4 py-2 text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {launching ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes
          </button>
        ) : (
          <button
            onClick={() => { patch({ launchMode: "draft" }); void launch(); }}
            disabled={!nameOk || launching}
            className="inline-flex items-center gap-1.5 rounded-full bg-section text-ink-secondary px-3.5 py-2 text-[12px] hover:bg-hover transition-colors disabled:opacity-40"
          >
            <Save size={13} /> Save draft
          </button>
        )}
        <button onClick={() => router.push(cancelHref)} title="Cancel" className="flex items-center justify-center w-[34px] h-[34px] rounded-lg text-ink-muted hover:bg-section transition-colors">
          <X size={17} />
        </button>
      </header>

      <div className="flex flex-1 min-h-0 items-stretch">
        {/* Step rail */}
        <aside className="flex flex-col w-[312px] shrink-0 border-r border-border-subtle px-5 py-6 bg-section/30">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-4">{isEdit ? "Edit campaign" : "New campaign"}</span>
          <div className="flex flex-col gap-1">
            {order.map((id, i) => {
              const done = i < curIdx;
              const current = id === s.step;
              const reachable = i <= curIdx || s.visited[id];
              return (
                <button
                  key={id}
                  onClick={() => reachable && go(id)}
                  className={cn(
                    "flex items-start gap-3 w-full px-3 py-2.5 rounded-[11px] text-left transition-colors",
                    current && "bg-section",
                    !reachable && "opacity-50 cursor-default",
                    reachable && !current && "hover:bg-section/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-[26px] h-[26px] rounded-full shrink-0 text-[12px] font-semibold",
                      done ? "bg-accent text-on-ink" : current ? "bg-ink text-on-ink" : "bg-section text-ink-muted border border-border-default",
                    )}
                  >
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className={cn("text-[13px] whitespace-nowrap", current ? "font-semibold text-ink" : done ? "font-medium text-ink" : "font-medium text-ink-secondary")}>
                      {STEP_META[id][0]}
                    </span>
                    <span className="text-[11px] text-ink-faint whitespace-nowrap">{STEP_META[id][1]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grow" />
          <div className="rounded-[14px] bg-surface border border-border-subtle p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Summary</span>
            <div className="flex flex-col gap-2.5 mt-3">
              <SummaryRow label="Audience" value={s.audMode === "dynamic" ? `${matchEstimate.toLocaleString()} leads` : "Static list"} />
              <SummaryRow label="Sequence" value={`${s.steps.length} step${s.steps.length === 1 ? "" : "s"}`} />
              <SummaryRow label="Email" value={!hasEmailStep ? "—" : s.emailAuto ? "Automated" : "Manual"} valueClass={hasEmailStep && s.emailAuto ? "text-signal-blue-text" : "text-ink"} />
              <SummaryRow label="Team" value={`${s.members.length + 1} member${s.members.length + 1 === 1 ? "" : "s"}`} />
            </div>
          </div>
        </aside>

        {/* Main + footer */}
        <div className="flex flex-col grow min-w-0">
          <main className="grow overflow-y-auto px-10 pt-8 pb-10">
            <div className="max-w-[740px] mx-auto">

              {/* ===== DETAILS ===== */}
              {s.step === "details" && (
                <section>
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Campaign details</h2>
                  <p className="text-[13px] text-ink-muted mt-1">Name your campaign and decide who can see and work it.</p>
                  <div className="flex flex-col gap-5 mt-6">
                    <Field label="Campaign name">
                      <input value={s.name} onChange={(e) => patch({ name: e.target.value })} className="wfld" placeholder="e.g. Enterprise Outbound — Q3" autoFocus />
                    </Field>
                    <Field label="Description" optional>
                      <textarea value={s.desc} onChange={(e) => patch({ desc: e.target.value })} rows={2} className="wfld resize-y min-h-[62px] leading-relaxed" placeholder="Who this targets and the goal of the outreach." />
                    </Field>

                    <div className="flex flex-col gap-2.5">
                      <label className="text-[12px] font-medium text-ink-secondary">Visibility</label>
                      <div className="flex gap-3">
                        {([
                          { id: "private", icon: Lock, title: "Private", desc: "Only assigned members can view and work this campaign." },
                          { id: "public", icon: Globe, title: "Public", desc: "Everyone on your team can view this campaign." },
                        ] as const).map((v) => {
                          const sel = s.visibility === v.id;
                          return (
                            <button
                              key={v.id}
                              onClick={() => patch({ visibility: v.id })}
                              className={cn("flex flex-col grow items-stretch text-left p-[15px] rounded-xl border transition-colors", sel ? "bg-section border-accent" : "bg-surface border-border-default hover:border-border-default")}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-section"><v.icon size={16} className="text-ink" /></span>
                                <span className={cn("flex items-center justify-center w-[18px] h-[18px] rounded-full border", sel ? "border-accent" : "border-border-default")}>
                                  {sel && <span className="w-2 h-2 rounded-full bg-accent" />}
                                </span>
                              </div>
                              <span className="text-[14px] font-semibold mt-3">{v.title}</span>
                              <span className="text-[12px] text-ink-muted mt-1 leading-snug">{v.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {deptOptions.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <MultiSelectPills
                          label="Departments"
                          options={deptOptions}
                          selected={s.departments}
                          onChange={(departments) => patch({ departments })}
                          placeholder="Search departments…"
                        />
                        <span className="text-[11px] text-ink-faint -mt-1">
                          Everyone in these departments gets access — including people added to them later.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <MemberMultiSelect
                        label="Assigned people"
                        options={reps.filter((r) => r.id !== ownerId).map((r) => ({ id: r.id, name: r.name, email: r.email }))}
                        selected={s.members}
                        onChange={(members) => patch({ members })}
                        pinned={ownerId ? [{ id: ownerId, name: reps.find((r) => r.id === ownerId)?.name || "You", note: "owner" }] : []}
                        placeholder="Search people to add…"
                      />
                      <span className="text-[11px] text-ink-faint">
                        {s.visibility === "private"
                          ? "Private campaign — only the departments + people above (and the owner) can see it."
                          : "Public campaign — visible to the whole team; the people above are the assigned workers."}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* ===== AUDIENCE ===== */}
              {s.step === "audience" && (
                <section>
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Audience</h2>
                  <p className="text-[13px] text-ink-muted mt-1">Decide which leads enter this campaign. A dynamic audience keeps enrolling new leads as they match.</p>

                  <div className="flex gap-3 mt-6">
                    {([
                      { id: "dynamic", icon: Filter, title: "Dynamic audience", desc: "Leads that match your filters enter automatically — now and as new ones qualify." },
                      { id: "static", icon: List, title: "Static list", desc: "Import a fixed CSV or pick an existing list. No automatic enrollment." },
                    ] as const).map((a) => {
                      const sel = s.audMode === a.id;
                      return (
                        <button key={a.id} onClick={() => patch({ audMode: a.id })} className={cn("flex flex-col grow text-left p-[15px] rounded-xl border transition-colors", sel ? "bg-section border-accent" : "bg-surface border-border-default")}>
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-section"><a.icon size={15} className="text-ink" /></span>
                            <span className="text-[13.5px] font-semibold">{a.title}</span>
                          </div>
                          <span className="text-[12px] text-ink-muted mt-2.5 leading-snug">{a.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {s.audMode === "dynamic" ? (
                    <>
                      <div className="rounded-[14px] border border-border-subtle bg-surface p-[18px] mt-[18px]">
                        <div className="flex items-center gap-2 text-[13px] text-ink-secondary flex-wrap">
                          Leads matching
                          <div className="relative" data-menu>
                            <button onClick={() => patch({ menu: s.menu === "match" ? null : "match" })} className="inline-flex items-center gap-1.5 bg-section border border-border-default rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink">
                              {s.matchAll ? "ALL" : "ANY"}<ChevronDown size={12} />
                            </button>
                            {s.menu === "match" && (
                              <div className="wmenu min-w-[130px] left-0 top-9">
                                <div className="wmi" onClick={() => patch({ matchAll: true, menu: null })}>ALL</div>
                                <div className="wmi" onClick={() => patch({ matchAll: false, menu: null })}>ANY</div>
                              </div>
                            )}
                          </div>
                          of these filters
                        </div>

                        <div className="flex flex-col gap-2.5 mt-4">
                          {s.conditions.map((c) => {
                            const F = FIELDS[c.field];
                            const Icon = F.icon;
                            const isRep = F.type === "rep";
                            const opts = isRep ? reps.map((r) => r.id) : (F.options ?? []);
                            const valLabel = isRep ? repName(c.value) : c.value;
                            const menuKey = `cond:${c.id}`;
                            return (
                              <div key={c.id} className="flex items-center gap-3 bg-surface border border-border-subtle rounded-[10px] px-3 py-2.5">
                                <Icon size={15} className="text-ink-muted shrink-0" />
                                <span className="text-[13px] font-medium whitespace-nowrap">{F.label}</span>
                                <span className="text-[12px] text-ink-muted whitespace-nowrap">{F.op}</span>
                                <div className="relative" data-menu>
                                  <button onClick={() => patch({ menu: s.menu === menuKey ? null : menuKey })} className="inline-flex items-center gap-1.5 bg-section border border-border-default rounded-lg px-2.5 py-1.5 text-[12px] text-ink">
                                    {isRep && <MemberAvatar id={c.value} name={valLabel} className="w-[18px] h-[18px] text-[8px]" />}
                                    {valLabel}<ChevronDown size={12} />
                                  </button>
                                  {s.menu === menuKey && (
                                    <div className="wmenu min-w-[160px] max-h-[230px] overflow-y-auto left-0 top-[38px]">
                                      {opts.map((o) => {
                                        const lab = isRep ? repName(o) : o;
                                        return (
                                          <div
                                            key={o}
                                            className="wmi justify-between"
                                            onClick={() => setS((p) => ({ ...p, conditions: p.conditions.map((x) => x.id === c.id ? { ...x, value: o } : x), menu: null }))}
                                          >
                                            <span className="flex items-center gap-2">
                                              {isRep && <MemberAvatar id={o} name={lab} className="w-[18px] h-[18px] text-[8px]" />}{lab}
                                            </span>
                                            {c.value === o && <Check size={13} />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                <div className="grow" />
                                <button onClick={() => setS((p) => ({ ...p, conditions: p.conditions.filter((x) => x.id !== c.id), menu: null }))} className="flex items-center justify-center w-[26px] h-[26px] rounded-md text-ink-faint hover:bg-section hover:text-ink-secondary transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}

                          <div className="relative self-start" data-menu>
                            <button onClick={() => patch({ menu: s.menu === "addfilter" ? null : "addfilter" })} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent px-2.5 py-2 border border-dashed border-border-default rounded-[9px]">
                              <Plus size={14} /> Add filter
                            </button>
                            {s.menu === "addfilter" && (
                              <div className="wmenu min-w-[200px] left-0 top-[42px]">
                                {addableFields.map((f) => {
                                  const Icon = FIELDS[f].icon;
                                  return (
                                    <div
                                      key={f}
                                      className="wmi"
                                      onClick={() => {
                                        const F = FIELDS[f];
                                        const v = F.type === "rep" ? (reps[0]?.id ?? ownerId) : (F.options?.[0] ?? "");
                                        setS((p) => ({ ...p, conditions: [...p.conditions, { id: `k${++SID}`, field: f, value: v }], menu: null }));
                                      }}
                                    >
                                      <Icon size={14} />{FIELDS[f].label}
                                    </div>
                                  );
                                })}
                                {addableFields.length === 0 && <div className="px-2.5 py-2 text-[12px] text-ink-faint">All filters added</div>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-[18px] pt-4 border-t border-border-subtle">
                          <div className="flex items-center gap-2.5">
                            <Users size={18} className="text-accent" />
                            <div className="flex flex-col">
                              <span className="text-[17px] font-semibold">
                                ~{matchEstimate.toLocaleString()} <span className="text-[12px] font-normal text-ink-muted">leads match (estimated)</span>
                              </span>
                              <span className="text-[11px] text-ink-faint">Updated live as you adjust filters</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[12px] text-ink-secondary">Auto-enroll new matches</span>
                            <Toggle on={s.autoEnroll} onClick={() => patch({ autoEnroll: !s.autoEnroll })} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[14px] border border-border-subtle bg-surface mt-3.5 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Matching leads</span>
                          <span className="text-[11px] text-ink-faint">Preview</span>
                        </div>
                        <div className="px-4 py-6 text-center">
                          <p className="text-[12px] text-ink-muted">
                            Matching leads are evaluated when the campaign goes live{s.autoEnroll ? ", then kept in sync as new leads qualify." : "."}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[14px] border border-dashed border-border-default bg-surface p-[30px] mt-[18px] text-center">
                      <span className="flex items-center justify-center w-[46px] h-[46px] rounded-xl bg-section mx-auto mb-3.5"><Upload size={20} className="text-ink-muted" /></span>
                      <div className="text-[14px] font-semibold">Import a CSV or choose an existing list</div>
                      <p className="text-[12px] text-ink-muted mt-1.5 max-w-[340px] mx-auto">Static audiences are fixed at import — new leads won’t be added automatically. You’ll import after the campaign is created.</p>
                    </div>
                  )}
                </section>
              )}

              {/* ===== SEQUENCE ===== */}
              {s.step === "sequence" && (
                <section>
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Sequence</h2>
                  <p className="text-[13px] text-ink-muted mt-1">Order your outreach steps across channels and set the timing between them.</p>

                  <div className="flex flex-col mt-6">
                    {s.steps.map((st, i) => {
                      const c = CH[st.ch];
                      const Icon = c.icon;
                      const prevDay = i > 0 ? s.steps[i - 1].day : null;
                      const gap = prevDay === null ? null : st.day - prevDay;
                      const gapLabel = gap === null ? null : gap <= 0 ? "same day" : `wait ${gap} ${gap === 1 ? "day" : "days"}`;
                      const isEmailAuto = st.ch === "email" && s.emailAuto;
                      const isManual = st.ch === "task" || (st.ch === "email" && !s.emailAuto);
                      return (
                        <div key={st.id}>
                          {gapLabel && (
                            <div className="flex items-center gap-2 pl-[19px] h-[30px] text-ink-faint">
                              <span className="w-0.5 h-full bg-border-default" />
                              <Clock size={12} className="ml-1.5" />
                              <span className="text-[11px] whitespace-nowrap">{gapLabel}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-3 rounded-[14px] border border-border-subtle bg-surface p-3.5 hover:border-border-default transition-colors">
                            <span className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-section shrink-0 mt-px"><Icon size={17} className={c.color} /></span>
                            <div className="flex flex-col grow gap-2.5 min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-[13.5px] font-semibold whitespace-nowrap">{c.label}</span>
                                <div className="flex items-center bg-section rounded-lg overflow-hidden">
                                  <button onClick={() => setS((p) => ({ ...p, steps: p.steps.map((x) => x.id === st.id ? { ...x, day: Math.max(0, x.day - 1) } : x) }))} className="flex items-center justify-center w-[26px] h-[26px] text-ink-muted hover:bg-hover"><Minus size={13} /></button>
                                  <span className="text-[11px] font-semibold px-2 leading-[26px] min-w-[54px] text-center">Day {st.day}</span>
                                  <button onClick={() => setS((p) => ({ ...p, steps: p.steps.map((x) => x.id === st.id ? { ...x, day: x.day + 1 } : x) }))} className="flex items-center justify-center w-[26px] h-[26px] text-ink-muted hover:bg-hover"><Plus size={13} /></button>
                                </div>
                                {isEmailAuto && <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-blue text-signal-blue-text"><Zap size={10} />Automated</span>}
                                {isManual && <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted"><User size={10} />Manual</span>}
                              </div>
                              <input value={st.body} onChange={(e) => setS((p) => ({ ...p, steps: p.steps.map((x) => x.id === st.id ? { ...x, body: e.target.value } : x) }))} className="wfld text-[12.5px] py-2 px-3" placeholder={c.placeholder} />
                            </div>
                            <button onClick={() => setS((p) => ({ ...p, steps: p.steps.filter((x) => x.id !== st.id) }))} className="flex items-center justify-center w-7 h-7 rounded-md text-ink-faint hover:bg-section hover:text-ink-secondary transition-colors shrink-0"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                    {s.steps.length === 0 && (
                      <div className="rounded-[14px] border border-dashed border-border-default bg-surface px-4 py-8 text-center text-[12px] text-ink-muted">
                        No steps — this campaign runs without a sequence. Leads stay workable and are never auto-completed. Add steps below if you want automated outreach.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5 mt-4 items-center">
                    <span className="text-[11px] text-ink-muted mr-0.5">Add step:</span>
                    {ADD_CHANNELS.map((ch) => {
                      const c = CH[ch];
                      const Icon = c.icon;
                      return (
                        <button
                          key={ch}
                          onClick={() => setS((p) => {
                            const maxDay = p.steps.reduce((a, x) => Math.max(a, x.day), -1);
                            return { ...p, steps: [...p.steps, { id: `s${++SID}`, ch, day: maxDay < 0 ? 0 : maxDay + 2, body: "" }] };
                          })}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary bg-surface border border-border-default rounded-full px-3 py-1.5 hover:border-accent hover:text-ink transition-colors"
                        >
                          <Icon size={13} className={c.color} />{c.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[14px] border border-border-subtle bg-surface p-4 mt-6">
                    <div className="flex items-center gap-2.5">
                      <Flag size={15} className="text-ink-muted" />
                      <span className="text-[13.5px] font-semibold">Stop the sequence for a lead when…</span>
                    </div>
                    <div className="flex flex-col mt-3">
                      {([
                        ["reply", "Lead replies", "Stop as soon as they respond on any channel"],
                        ["meeting", "Meeting is booked", "Stop when a meeting is scheduled"],
                        ["opp", "Opportunity created", "Stop when the lead becomes a deal"],
                      ] as const).map(([k, label, desc]) => (
                        <div key={k} className="flex items-center justify-between py-2.5">
                          <div className="flex flex-col">
                            <span className="text-[13px]">{label}</span>
                            <span className="text-[11px] text-ink-faint mt-px">{desc}</span>
                          </div>
                          <Toggle on={s.exit[k]} onClick={() => toggleExit(k)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* ===== EMAIL AUTOMATION ===== */}
              {s.step === "email" && (
                <section>
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Email automation</h2>
                  <p className="text-[13px] text-ink-muted mt-1">Your sequence includes {emailStepN} email step{emailStepN === 1 ? "" : "s"}. Choose whether Leadey sends them automatically or hands them to the rep.</p>

                  <div className="flex items-center justify-between rounded-[14px] border border-border-subtle bg-surface p-[18px] mt-6">
                    <div className="flex items-center gap-3.5">
                      <span className="flex items-center justify-center w-10 h-10 rounded-[11px] bg-signal-blue"><Zap size={19} className="text-signal-blue-text" /></span>
                      <div className="flex flex-col">
                        <span className="text-[14.5px] font-semibold">Automate cold emailing</span>
                        <span className="text-[12px] text-ink-muted mt-0.5">Send through connected mailboxes with rotation, limits & tracking.</span>
                      </div>
                    </div>
                    <Toggle on={s.emailAuto} onClick={() => patch({ emailAuto: !s.emailAuto })} />
                  </div>

                  {s.emailAuto ? (
                    <div className="flex flex-col gap-4 mt-[18px]">
                      {/* Mailboxes */}
                      <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                          <div className="flex flex-col">
                            <span className="text-[13.5px] font-semibold">Sending mailboxes</span>
                            <span className="text-[11px] text-ink-faint mt-px">Rotate sends across selected inboxes to protect deliverability.</span>
                          </div>
                          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-secondary">Capacity {capacity}/day</span>
                        </div>
                        {accounts.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-[12px] text-ink-muted">No connected mailboxes yet.</p>
                            <button onClick={() => router.push("/dashboard/settings?tab=email-accounts")} className="mt-2 text-[12px] text-accent font-medium">Connect a mailbox →</button>
                          </div>
                        ) : (
                          accounts.map((m) => {
                            const sel = !!s.mailboxSel[m.id];
                            const limit = s.mailboxLimit[m.id] ?? 50;
                            const active = m.status === "active";
                            return (
                              <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b border-border-subtle last:border-b-0">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setS((p) => ({ ...p, mailboxSel: { ...p.mailboxSel, [m.id]: !p.mailboxSel[m.id] } }))} className={cn("flex items-center justify-center w-5 h-5 rounded-md shrink-0 border transition-colors", sel ? "bg-accent border-accent" : "border-border-default")}>
                                    {sel && <Check size={13} className="text-on-ink" />}
                                  </button>
                                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-section"><Mail size={15} className="text-ink-muted" /></span>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-medium">{m.email}</span>
                                    <span className="text-[11px] text-ink-faint">{m.fromName || m.provider}</span>
                                  </div>
                                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5", active ? "bg-signal-green text-signal-green-text" : "bg-signal-slate text-signal-slate-text")}>
                                    <span className="w-[5px] h-[5px] rounded-full bg-current" />{active ? "Connected" : m.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[11px] text-ink-faint">/ day</span>
                                  <div className={cn("flex items-center bg-section rounded-lg overflow-hidden", !sel && "opacity-40")}>
                                    <button onClick={() => setS((p) => ({ ...p, mailboxLimit: { ...p.mailboxLimit, [m.id]: Math.max(5, (p.mailboxLimit[m.id] ?? 50) - 5) } }))} className="flex items-center justify-center w-6 h-[26px] text-ink-muted"><Minus size={12} /></button>
                                    <span className="text-[12px] font-semibold px-1 leading-[26px] min-w-[30px] text-center">{limit}</span>
                                    <button onClick={() => setS((p) => ({ ...p, mailboxLimit: { ...p.mailboxLimit, [m.id]: (p.mailboxLimit[m.id] ?? 50) + 5 } }))} className="flex items-center justify-center w-6 h-[26px] text-ink-muted"><Plus size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex gap-4">
                        <div className="grow rounded-[14px] border border-border-subtle bg-surface p-4">
                          <span className="text-[13px] font-semibold">Daily cap & ramp-up</span>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[12px] text-ink-muted">Campaign daily cap</span>
                            <div className="flex items-center bg-section rounded-lg overflow-hidden">
                              <button onClick={() => patch({ dailyCap: Math.max(10, s.dailyCap - 10) })} className="flex items-center justify-center w-[26px] h-[26px] text-ink-muted"><Minus size={13} /></button>
                              <span className="text-[12px] font-semibold px-2 leading-[26px] min-w-[44px] text-center">{s.dailyCap}</span>
                              <button onClick={() => patch({ dailyCap: s.dailyCap + 10 })} className="flex items-center justify-center w-[26px] h-[26px] text-ink-muted"><Plus size={13} /></button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex flex-col">
                              <span className="text-[12px] text-ink-secondary">Gradual ramp-up</span>
                              <span className="text-[11px] text-ink-faint mt-px">Start low, increase daily</span>
                            </div>
                            <Toggle on={s.ramp} onClick={() => patch({ ramp: !s.ramp })} />
                          </div>
                        </div>
                        <div className="grow rounded-[14px] border border-border-subtle bg-surface p-4">
                          <span className="text-[13px] font-semibold">Sending window</span>
                          <div className="flex gap-1.5 mt-3">
                            {DAY_DEFS.map(([k, lab, full]) => (
                              <button key={k} onClick={() => toggleDay(k)} title={full} className={cn("flex items-center justify-center w-8 h-8 rounded-lg text-[11px] font-semibold transition-colors", s.days[k] ? "bg-accent text-on-ink" : "bg-section text-ink-muted")}>{lab}</button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2.5 mt-3">
                            <input value={s.sendStart} onChange={(e) => patch({ sendStart: e.target.value })} className="wfld w-[84px] text-center py-1.5" />
                            <span className="text-[12px] text-ink-faint">to</span>
                            <input value={s.sendEnd} onChange={(e) => patch({ sendEnd: e.target.value })} className="wfld w-[84px] text-center py-1.5" />
                            <span className="text-[11px] text-ink-muted">local</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[14px] border border-border-subtle bg-surface p-4">
                        <span className="text-[13px] font-semibold">Tracking & safety</span>
                        <div className="flex flex-col mt-2">
                          {([
                            ["opens", "Open tracking", "See who opens your emails"],
                            ["clicks", "Click tracking", "Track link clicks in your emails"],
                            ["unsub", "Include unsubscribe link", "Required for compliant cold outreach"],
                          ] as const).map(([k, label, desc]) => (
                            <div key={k} className="flex items-center justify-between py-2.5">
                              <div className="flex flex-col">
                                <span className="text-[13px]">{label}</span>
                                <span className="text-[11px] text-ink-faint mt-px">{desc}</span>
                              </div>
                              <Toggle on={s.track[k]} onClick={() => toggleTrack(k)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[14px] border border-border-subtle bg-surface p-5 mt-[18px]">
                      <div className="flex gap-3">
                        <span className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-section shrink-0"><UserRound size={18} className="text-ink-muted" /></span>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold">Email steps will be manual</span>
                          <span className="text-[12.5px] text-ink-muted mt-1 leading-relaxed">Each email step becomes a task in the assigned rep’s queue. They’ll send it from their own inbox — no automated sending, mailbox rotation, or daily caps. You can switch automation on anytime.</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-3.5 pt-3.5 border-t border-border-subtle">
                        <div className="flex items-center gap-2 text-[12px] text-ink-secondary"><Check size={14} className="text-signal-green-text" />Reps keep full control of wording and timing</div>
                        <div className="flex items-center gap-2 text-[12px] text-ink-secondary"><Check size={14} className="text-signal-green-text" />Good for high-value, low-volume outreach</div>
                        <div className="flex items-center gap-2 text-[12px] text-ink-muted"><Info size={14} className="text-ink-faint" />No deliverability automation or A/B testing</div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ===== REVIEW ===== */}
              {s.step === "review" && (
                <section>
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{isEdit ? "Review changes" : "Review & launch"}</h2>
                  <p className="text-[13px] text-ink-muted mt-1">{isEdit ? "Confirm the setup. Changes apply to the live campaign on save." : "Confirm the setup. You can edit any section before going live."}</p>

                  <div className="flex flex-col gap-3.5 mt-6">
                    <ReviewCard title="Details" onEdit={() => go("details")}>
                      <div className="flex gap-6 flex-wrap mt-3">
                        <ReviewKV label="Name" value={titleDisplay} />
                        <ReviewKV label="Visibility" value={s.visibility} capitalize />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-ink-faint">Team</span>
                          <div className="flex items-center mt-1 pl-1.5">
                            {[ownerId, ...s.members].map((id) => (
                              <MemberAvatar key={id} id={id} name={repName(id)} className="w-[26px] h-[26px] text-[9px] -ml-1.5 border-2 border-page" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </ReviewCard>

                    <ReviewCard title="Audience" onEdit={() => go("audience")}>
                      <div className="flex items-center gap-2.5 mt-3">
                        <Users size={16} className="text-accent" />
                        <span className="text-[13px]">
                          {s.audMode === "dynamic"
                            ? `~${matchEstimate.toLocaleString()} leads match${s.autoEnroll ? " · auto-enrolling new matches" : " · no auto-enroll"}`
                            : "Static list — fixed at import"}
                        </span>
                      </div>
                      {s.audMode === "dynamic" && s.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {s.conditions.map((c) => {
                            const F = FIELDS[c.field];
                            const v = F.type === "rep" ? repName(c.value) : c.value;
                            return <span key={c.id} className="text-[11px] rounded-full px-2 py-0.5 bg-section text-ink-secondary whitespace-nowrap">{F.label} {F.op} {v}</span>;
                          })}
                        </div>
                      )}
                    </ReviewCard>

                    <ReviewCard title={`Sequence · ${s.steps.length} step${s.steps.length === 1 ? "" : "s"}`} onEdit={() => go("sequence")}>
                      <div className="flex flex-wrap items-center mt-3">
                        {s.steps.map((st, i) => {
                          const c = CH[st.ch];
                          const Icon = c.icon;
                          return (
                            <span key={st.id} className="flex items-center">
                              {i > 0 && <span className="w-2.5 h-px bg-border-default self-center" />}
                              <span className="inline-flex items-center gap-1.5 bg-surface border border-border-subtle rounded-full px-2.5 py-1 text-[11px] text-ink-secondary whitespace-nowrap">
                                <Icon size={12} className={c.color} />{c.label} · D{st.day}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </ReviewCard>

                    <ReviewCard title="Email automation" onEdit={hasEmailStep ? () => go("email") : undefined}>
                      <div className="flex items-center gap-2.5 mt-3">
                        {!hasEmailStep ? (
                          <><Minus size={16} className="text-ink-faint" /><span className="text-[13px]">No email steps in this sequence.</span></>
                        ) : s.emailAuto ? (
                          <><Zap size={16} className="text-signal-blue-text" /><span className="text-[13px]">Automated · {selectedMailboxes.length} mailbox{selectedMailboxes.length === 1 ? "" : "es"} · up to {capacity} emails/day</span></>
                        ) : (
                          <><UserRound size={16} className="text-ink-muted" /><span className="text-[13px]">Manual — email steps go to the rep’s task queue.</span></>
                        )}
                      </div>
                    </ReviewCard>

                    {error && (
                      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 px-4 py-3">
                        <p className="text-[12px] text-signal-red-text">{error}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-[14px] border border-border-subtle bg-surface p-[18px] mt-1">
                      <div className="flex items-center gap-3">
                        <Rocket size={18} className="text-accent" />
                        <div className="flex flex-col">
                          <span className="text-[13.5px] font-semibold">{isEdit ? "Save your changes" : "Ready to launch"}</span>
                          <span className="text-[12px] text-ink-muted mt-px">
                            {isEdit
                              ? "Updates take effect immediately. Status is managed from the campaign page."
                              : s.launchMode === "launch"
                                ? "Outreach starts immediately for matching leads."
                                : "Saved as a draft — activate it whenever you're ready."}
                          </span>
                        </div>
                      </div>
                      {isEdit ? (
                        <button
                          onClick={() => void launch()}
                          disabled={launching}
                          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-on-ink px-[18px] py-2.5 text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {launching ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
                        </button>
                      ) : (
                        <div className="flex items-center bg-section rounded-full p-[3px]">
                          {(["launch", "draft"] as const).map((m) => (
                            <button key={m} onClick={() => patch({ launchMode: m })} className={cn("rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all", s.launchMode === m ? "bg-surface text-ink shadow-sm" : "text-ink-muted")}>
                              {m === "launch" ? "Launch now" : "Save as draft"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

            </div>
          </main>

          {/* Footer */}
          <footer className="flex items-center justify-between shrink-0 border-t border-border-subtle px-10 py-3.5 bg-section/40 backdrop-blur-sm">
            <button onClick={back} className={cn("inline-flex items-center gap-1.5 rounded-full bg-section text-ink-secondary px-4 py-2 text-[12px]", curIdx === 0 && "opacity-40 pointer-events-none")}>
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-3.5">
              <span className="text-[12px] text-ink-faint">Step {curIdx + 1} of {order.length}</span>
              <button
                onClick={() => { if (!(s.step === "details" && !nameOk)) next(); }}
                disabled={(s.step === "details" && !nameOk) || launching}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-on-ink px-[18px] py-2.5 text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {launching ? <Loader2 size={14} className="animate-spin" /> : null}
                {s.step === "review"
                  ? isEdit ? "Save changes" : s.launchMode === "launch" ? "Launch campaign" : "Save draft"
                  : "Continue"}
                {!launching && (s.step === "review"
                  ? isEdit ? <Save size={14} /> : s.launchMode === "launch" ? <Rocket size={14} /> : <Save size={14} />
                  : <ArrowRight size={14} />)}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* Success overlay */}
      {launched && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-page/80 backdrop-blur-sm">
          <div className="w-[420px] rounded-[14px] border border-border-subtle bg-surface p-9 text-center flex flex-col items-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-[18px] bg-signal-green"><Check size={30} className="text-signal-green-text" /></span>
            <h2 className="text-[19px] font-semibold mt-4">{isEdit ? "Changes saved" : s.launchMode === "launch" ? "Campaign launched" : "Draft saved"}</h2>
            <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">
              “{titleDisplay}” {isEdit
                ? "has been updated. Your changes are now live."
                : s.launchMode === "launch"
                  ? `is live. ${s.audMode === "dynamic" ? "Matching leads are entering the sequence now." : "Your imported leads are entering the sequence now."}`
                  : "was saved as a draft. Activate it anytime from Campaigns."}
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              <button onClick={() => createdId && router.push(`/dashboard/funnels/${createdId}`)} className="rounded-full bg-ink text-on-ink px-[18px] py-2.5 text-[12px] font-medium hover:opacity-90 transition-opacity">
                Open campaign
              </button>
              <button onClick={() => router.push("/dashboard/funnels")} className="rounded-full bg-section text-ink-secondary px-[18px] py-2.5 text-[12px] hover:bg-hover transition-colors">
                View campaigns
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .wfld { background: var(--color-surface); border: 1px solid var(--color-border-default); border-radius: 9px; padding: 10px 12px; font-size: 13px; color: var(--color-ink); width: 100%; outline: none; transition: border-color .15s; }
        .wfld:focus { border-color: var(--color-accent); }
        .wfld::placeholder { color: var(--color-ink-faint); }
        .wmenu { position: absolute; z-index: 60; background: var(--color-surface); border: 1px solid var(--color-border-default); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 6px; display: flex; flex-direction: column; }
        .wmi { display: flex; align-items: center; gap: 9px; border-radius: 7px; padding: 8px 10px; font-size: 12px; color: var(--color-ink-secondary); cursor: pointer; white-space: nowrap; transition: .12s; }
        .wmi:hover { background: var(--color-section); color: var(--color-ink); }
      `}</style>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────
function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className={cn("text-[12px] font-semibold whitespace-nowrap", valueClass)}>{value}</span>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-ink-secondary">
        {label}{optional && <span className="text-ink-faint font-normal"> · optional</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-semibold">{title}</span>
        {onEdit && (
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-[11px] text-accent">
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ReviewKV({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-ink-faint">{label}</span>
      <span className={cn("text-[13px] font-medium mt-0.5", capitalize && "capitalize")}>{value}</span>
    </div>
  );
}
