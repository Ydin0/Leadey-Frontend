"use client";

import { Mail, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Template } from "@/lib/types/template";

const categoryColors: Record<string, string> = {
  outreach: "bg-signal-blue text-signal-blue-text",
  follow_up: "bg-signal-green text-signal-green-text",
  breakup: "bg-signal-red text-signal-red-text",
  referral: "bg-signal-slate text-signal-slate-text",
  custom: "bg-section text-ink-muted",
};

const categoryLabels: Record<string, string> = {
  outreach: "Outreach",
  follow_up: "Follow-up",
  breakup: "Breakup",
  referral: "Referral",
  custom: "Custom",
};

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const ChannelIcon = template.channel === "email" ? Mail : Linkedin;

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface rounded-[14px] border border-border-subtle p-5 transition-colors hover:border-border-default text-left w-full group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            template.channel === "email" ? "bg-signal-blue/10" : "bg-[#0A66C2]/10"
          )}>
            <ChannelIcon size={13} className={template.channel === "email" ? "text-signal-blue-text" : "text-[#0A66C2]"} />
          </div>
          <h3 className="text-[13px] font-semibold text-ink truncate">{template.name}</h3>
        </div>
        {template.category && (
          <span className={cn("text-[9px] font-medium rounded-full px-2 py-0.5 shrink-0 ml-2", categoryColors[template.category] || categoryColors.custom)}>
            {categoryLabels[template.category] || template.category}
          </span>
        )}
      </div>

      {/* Subject (email only) */}
      {template.channel === "email" && template.subject && (
        <p className="text-[11px] font-medium text-ink-secondary mb-1 truncate">
          {template.subject}
        </p>
      )}

      {/* Body preview */}
      <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-3 mb-3">
        {template.body}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-section text-ink-muted">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-[9px] text-ink-faint">+{template.tags.length - 3}</span>
          )}
        </div>
        <span className="text-[10px] text-ink-faint">{formatRelativeTime(template.updatedAt)}</span>
      </div>
    </button>
  );
}
