"use client";

import { Phone, Mail, MessageSquare, Linkedin, Sparkles, type LucideIcon } from "lucide-react";
import type { CallQueueItem, LinkedInQueueItem, EmailSummary } from "@/lib/types";

type ChannelPreview = { label: string; icon: LucideIcon; fg: string };

const CHANNEL_PREVIEW: ChannelPreview[] = [
  { label: "Call", icon: Phone, fg: "text-signal-green-text" },
  { label: "Email", icon: Mail, fg: "text-signal-blue-text" },
  { label: "SMS", icon: MessageSquare, fg: "text-signal-slate-text" },
  { label: "LinkedIn", icon: Linkedin, fg: "text-linkedin" },
];

interface RepQueueCockpitProps {
  calls: (CallQueueItem & { funnelId?: string; leadId?: string })[];
  linkedin: (LinkedInQueueItem & { funnelId?: string; leadId?: string })[];
  email: EmailSummary;
}

// The smart queue is being rebuilt — show a polished "coming soon" panel
// instead of the placeholder queue. Props are retained so the dashboard page
// keeps passing data without changes once it's re-enabled.
export function RepQueueCockpit(_props: RepQueueCockpitProps) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-[18px]">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-ink">Work your queue</h2>
          <span className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-blue text-signal-blue-text">
            <Sparkles size={10} />
            Coming soon
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-signal-blue">
          <Sparkles size={22} className="text-signal-blue-text" strokeWidth={1.75} />
        </span>
        <div className="text-[14px] font-semibold text-ink">Your smart queue is coming soon</div>
        <p className="text-[12px] text-ink-muted max-w-[380px] leading-relaxed">
          We&apos;re building an auto-prioritized daily worklist that surfaces the right calls,
          emails, SMS and LinkedIn touches in the order they&apos;ll move deals — so you always
          know who to reach next.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1.5">
          {CHANNEL_PREVIEW.map((c) => (
            <span
              key={c.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium bg-section text-ink-muted border border-border-subtle"
            >
              <c.icon size={12} className={c.fg} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
