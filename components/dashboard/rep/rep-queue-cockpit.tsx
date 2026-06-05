"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MessageSquare,
  Linkedin,
  SkipForward,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallQueueItem, LinkedInQueueItem, EmailSummary } from "@/lib/types";

type QueueLead = {
  id: string;
  name: string;
  title: string;
  company: string;
  detail: string;
  funnelId?: string;
  leadId?: string;
};

type ChannelId = "call" | "email" | "sms" | "linkedin";

interface ChannelMeta {
  id: ChannelId;
  label: string;
  icon: LucideIcon;
  fg: string;
  tint: string;
  cta: string;
}

const CHANNELS: ChannelMeta[] = [
  { id: "call", label: "Call", icon: Phone, fg: "text-signal-green-text", tint: "bg-signal-green", cta: "Open" },
  { id: "email", label: "Email", icon: Mail, fg: "text-signal-blue-text", tint: "bg-signal-blue", cta: "Compose" },
  { id: "sms", label: "SMS", icon: MessageSquare, fg: "text-signal-slate-text", tint: "bg-signal-slate", cta: "Text" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, fg: "text-linkedin", tint: "bg-signal-slate", cta: "Open" },
];

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function QueueCard({
  lead,
  ch,
  onOpen,
  onSkip,
}: {
  lead: QueueLead;
  ch: ChannelMeta;
  onOpen: (lead: QueueLead) => void;
  onSkip: (id: string) => void;
}) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface p-3.5 hover:border-border-default transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-section flex items-center justify-center text-[12px] font-medium text-ink-secondary shrink-0">
          {initials(lead.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold text-ink truncate">{lead.name}</span>
            <ch.icon size={12} className={ch.fg} />
          </div>
          <div className="text-[11.5px] text-ink-muted truncate">
            {lead.title}
            {lead.company ? ` · ${lead.company}` : ""}
          </div>
        </div>
        {lead.detail && (
          <span className="text-[11px] text-ink-secondary truncate shrink-0 max-w-[40%]">{lead.detail}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
        <button
          onClick={() => onOpen(lead)}
          disabled={!lead.funnelId || !lead.leadId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
        >
          <ch.icon size={12} />
          {ch.cta}
        </button>
        <button
          onClick={() => onSkip(lead.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          <SkipForward size={11} />
          Skip
        </button>
        <div className="flex-1" />
        {lead.funnelId && lead.leadId && (
          <button
            onClick={() => onOpen(lead)}
            className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            View lead
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

interface RepQueueCockpitProps {
  calls: (CallQueueItem & { funnelId?: string; leadId?: string })[];
  linkedin: (LinkedInQueueItem & { funnelId?: string; leadId?: string })[];
  email: EmailSummary;
}

export function RepQueueCockpit({ calls, linkedin, email }: RepQueueCockpitProps) {
  const router = useRouter();
  const [active, setActive] = useState<ChannelId>("call");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const queues = useMemo<Record<ChannelId, QueueLead[]>>(() => {
    return {
      call: calls
        .filter((c) => !skipped.has(c.id))
        .map((c) => ({
          id: c.id,
          name: c.contact.name,
          title: c.contact.title,
          company: c.contact.company,
          detail: c.phone,
          funnelId: c.funnelId,
          leadId: c.leadId,
        })),
      linkedin: linkedin
        .filter((l) => !skipped.has(l.id))
        .map((l) => ({
          id: l.id,
          name: l.contact.name,
          title: l.contact.title,
          company: l.contact.company,
          detail: l.type === "connection_request" ? "Connection request" : "Send message",
          funnelId: l.funnelId,
          leadId: l.leadId,
        })),
      email: [],
      sms: [],
    };
  }, [calls, linkedin, skipped]);

  const counts: Record<ChannelId, number> = {
    call: queues.call.length,
    email: email.sentToday,
    sms: 0,
    linkedin: queues.linkedin.length,
  };
  const total = queues.call.length + queues.linkedin.length;

  const ch = CHANNELS.find((c) => c.id === active)!;
  const leads = queues[active];

  function open(lead: QueueLead) {
    if (lead.funnelId && lead.leadId) {
      router.push(`/dashboard/funnels/${lead.funnelId}/leads/${lead.leadId}`);
    }
  }
  function skip(id: string) {
    setSkipped((prev) => new Set(prev).add(id));
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-ink">Work your queue</h2>
          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">{total} due</span>
        </div>
      </div>

      {/* channel tabs */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {CHANNELS.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium border transition-colors",
                on ? "bg-hover text-ink border-border-default" : "bg-section text-ink-muted border-transparent hover:text-ink-secondary",
              )}
            >
              <c.icon size={13} className={on ? c.fg : "text-ink-muted"} />
              {c.label}
              <span
                className={cn(
                  "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                  on ? cn(c.tint, c.fg) : "bg-surface text-ink-faint",
                )}
              >
                {counts[c.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* content */}
      {active === "email" ? (
        <EmailGlance email={email} />
      ) : active === "sms" ? (
        <ClearedState label="SMS" note="SMS sending isn't wired up yet." />
      ) : leads.length ? (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => (
            <QueueCard key={lead.id} lead={lead} ch={ch} onOpen={open} onSkip={skip} />
          ))}
        </div>
      ) : (
        <ClearedState label={ch.label} note={`Every ${ch.label.toLowerCase()} touch for today is done.`} />
      )}
    </section>
  );
}

function EmailGlance({ email }: { email: EmailSummary }) {
  const stats = [
    { label: "Sent today", value: email.sentToday },
    { label: "Open rate", value: `${email.openRate}%` },
    { label: "Replies", value: email.replies },
    { label: "Reply rate", value: `${email.replyRate}%` },
    { label: "Bounces", value: email.bounces },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[12px] border border-border-subtle bg-section/40 p-3">
          <div className="text-[18px] font-semibold text-ink">{s.value}</div>
          <div className="text-[11px] text-ink-muted mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ClearedState({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-9 text-center">
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-signal-green">
        <Check size={20} className="text-signal-green-text" strokeWidth={2} />
      </span>
      <div className="text-[13px] font-medium text-ink">{label} queue cleared</div>
      <div className="text-[12px] text-ink-muted">{note}</div>
    </div>
  );
}
