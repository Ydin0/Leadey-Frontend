import { Linkedin, Mail, Phone } from "lucide-react";
import { LinkedInQueue } from "./linkedin-queue";
import { CallQueue } from "./call-queue";
import { EmailStatus } from "./email-status";
import type { FunnelCockpit } from "@/lib/types/funnel";

function SummaryChip({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle">
      <Icon size={13} strokeWidth={1.5} className={color} />
      <span className="text-[13px] font-medium text-ink">{value}</span>
      <span className="text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

export function CockpitView({ cockpit }: { cockpit: FunnelCockpit }) {
  return (
    <div>
      {/* Summary Chips */}
      <div className="flex items-center gap-3 mb-6">
        <SummaryChip icon={Linkedin} label="LinkedIn pending" value={cockpit.linkedin.length} color="text-linkedin" />
        <SummaryChip icon={Mail} label="Emails sent today" value={cockpit.email.sentToday} color="text-signal-blue-text" />
        <SummaryChip icon={Phone} label="Calls due" value={cockpit.calls.length} color="text-signal-green-text" />
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <LinkedInQueue items={cockpit.linkedin} />
        <CallQueue items={cockpit.calls} />
        <EmailStatus summary={cockpit.email} />
      </div>
    </div>
  );
}
