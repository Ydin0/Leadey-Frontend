import { Linkedin, Mail, Phone, MessageSquare } from "lucide-react";
import { LinkedInQueue } from "./linkedin-queue";
import { CallQueue } from "./call-queue";
import { WhatsAppQueue } from "./whatsapp-queue";
import { EmailStatus } from "./email-status";
import type { FunnelCockpit } from "@/lib/types/funnel";

function SummaryChip({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border-subtle">
      <Icon size={13} strokeWidth={1.5} className={color} />
      <span className="text-[13px] font-medium text-ink">{value}</span>
      <span className="text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

interface CockpitViewProps {
  cockpit: FunnelCockpit;
  funnelId?: string;
  onActionExecuted?: () => void;
}

export function CockpitView({ cockpit, funnelId, onActionExecuted }: CockpitViewProps) {
  // Compute LinkedIn daily progress for summary chip
  const progressEntries = Object.entries(cockpit.linkedinProgress || {});
  const primaryProgress = progressEntries.length > 0
    ? progressEntries.reduce((a, b) => (b[1].totalPending > a[1].totalPending ? b : a))[1]
    : null;
  const linkedinChipValue = primaryProgress
    ? `${primaryProgress.completed}/${primaryProgress.limit}`
    : String(cockpit.linkedin.length);
  const linkedinChipLabel = primaryProgress ? "LinkedIn today" : "LinkedIn pending";

  return (
    <div>
      {/* Summary Chips */}
      <div className="flex items-center gap-3 mb-6">
        <SummaryChip icon={Linkedin} label={linkedinChipLabel} value={linkedinChipValue} color="text-linkedin" />
        <SummaryChip icon={Mail} label="Emails sent today" value={cockpit.email.sentToday} color="text-signal-blue-text" />
        <SummaryChip icon={Phone} label="Calls due" value={cockpit.calls.length} color="text-signal-green-text" />
        <SummaryChip icon={MessageSquare} label="WhatsApp pending" value={(cockpit.whatsapp || []).length} color="text-signal-green-text" />
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <LinkedInQueue items={cockpit.linkedin} linkedinProgress={cockpit.linkedinProgress || {}} funnelId={funnelId} onActionExecuted={onActionExecuted} />
        <CallQueue items={cockpit.calls} />
        <WhatsAppQueue items={cockpit.whatsapp || []} />
        <EmailStatus summary={cockpit.email} />
      </div>
    </div>
  );
}
