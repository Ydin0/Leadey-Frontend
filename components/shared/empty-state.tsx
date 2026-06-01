import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="card-brand bg-surface rounded-[16px] p-12 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border border-border-subtle bg-[rgba(151,164,214,0.10)]">
        <Icon size={22} strokeWidth={1.5} className="text-[#97A4D6]" />
      </div>
      <h3 className="font-display text-[18px] font-light tracking-[-0.01em] text-ink mb-1">{title}</h3>
      <p className="text-[12px] text-ink-muted mb-5 max-w-xs mx-auto leading-[1.6]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
