import { type LucideIcon } from "lucide-react";
import { PageHead } from "./page-head";
import { EmptyState } from "@/components/shared/empty-state";

/** Placeholder for email screens that ship in a later phase. */
export function EmailComingSoon({
  icon,
  title,
  subtitle,
  feature,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  feature: string;
}) {
  return (
    <div>
      <PageHead eyebrow="Cold email" title={title} subtitle={subtitle} />
      <div className="bg-surface rounded-[14px] border border-border-subtle">
        <EmptyState
          icon={icon}
          title={`${feature} — coming soon`}
          description="This part of the cold email system is being built. Domains and Email Accounts are available now."
        />
      </div>
    </div>
  );
}
