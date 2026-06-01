"use client";

import { Building2, Mail, MapPin, Phone, Linkedin, AlertCircle } from "lucide-react";
import type { DialerQueueItem } from "@/lib/types/dialer";

interface LeadContextPanelProps {
  item: DialerQueueItem | null;
}

export function LeadContextPanel({ item }: LeadContextPanelProps) {
  if (!item || !item.lead) {
    return (
      <aside className="p-5 text-[11px] text-ink-muted">
        No lead selected.
      </aside>
    );
  }
  const lead = item.lead;
  const master = item.masterContact;

  return (
    <aside className="flex flex-col h-full overflow-y-auto px-5 py-5 space-y-4">
      <header>
        <div className="flex items-center gap-2 mb-1">
          {master?.doNotCall && (
            <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-red/15 text-signal-red-text flex items-center gap-1">
              <AlertCircle size={10} /> DNC
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            Lead {item.position + 1}
          </span>
        </div>
        <h1 className="text-[18px] font-semibold text-ink">{lead.name}</h1>
        <p className="text-[12px] text-ink-secondary">{lead.title}</p>
      </header>

      <Section title="Contact">
        <Row icon={<Phone size={11} />} value={item.leadPhone} mono />
        {lead.email && <Row icon={<Mail size={11} />} value={lead.email} />}
        {lead.linkedinUrl && (
          <Row
            icon={<Linkedin size={11} />}
            value={
              <a
                href={lead.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-signal-blue-text hover:underline truncate block"
              >
                LinkedIn profile
              </a>
            }
          />
        )}
        {master?.location && <Row icon={<MapPin size={11} />} value={master.location} />}
      </Section>

      <Section title="Company">
        <Row icon={<Building2 size={11} />} value={lead.company} />
      </Section>

      {master && (
        <Section title="Call History">
          <Row label="Total attempts" value={String(master.callAttempts)} />
          {master.lastCalledAt && (
            <Row
              label="Last called"
              value={new Date(master.lastCalledAt).toLocaleString()}
            />
          )}
          {master.timezone && <Row label="Timezone" value={master.timezone} />}
        </Section>
      )}

      <Section title="Funnel Progress">
        <Row label="Step" value={`${lead.currentStep} / ${lead.totalSteps}`} />
        <Row label="Status" value={lead.status} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label?: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {icon && <span className="text-ink-muted shrink-0">{icon}</span>}
      {label && <span className="text-ink-muted shrink-0">{label}</span>}
      <span className={`text-ink-secondary truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
