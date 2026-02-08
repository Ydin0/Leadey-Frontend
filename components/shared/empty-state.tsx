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
    <div className="bg-surface rounded-[14px] border border-border-subtle p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-section flex items-center justify-center mx-auto mb-4">
        <Icon size={22} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">{title}</h3>
      <p className="text-[12px] text-ink-muted mb-5 max-w-xs mx-auto">{description}</p>
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
