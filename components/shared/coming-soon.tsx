import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-12 text-center max-w-lg mx-auto mt-12">
      <div className="w-12 h-12 rounded-xl bg-section flex items-center justify-center mx-auto mb-4">
        <Icon size={24} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h2 className="text-[16px] font-semibold text-ink mb-1">{title}</h2>
      <span className="inline-block text-[10px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-2 py-0.5 mb-3">
        Coming Soon
      </span>
      <p className="text-[13px] text-ink-muted leading-relaxed">{description}</p>
    </div>
  );
}
