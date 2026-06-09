import { type ReactNode } from "react";

/** Standard page header for email screens: eyebrow + title + subtitle + actions. */
export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 mb-[22px] flex-wrap">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {subtitle && (
          <p className="text-[13px] text-ink-muted mt-1.5 max-w-[620px]">{subtitle}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
