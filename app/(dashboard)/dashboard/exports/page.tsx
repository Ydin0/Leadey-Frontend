import { Download } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function ExportsPage() {
  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h1 className="text-[18px] font-semibold text-ink">Exports</h1>
        <p className="text-[12px] text-ink-muted mt-0.5">
          Download lead lists, company data, and campaign reports.
        </p>
      </div>
      <EmptyState
        icon={Download}
        title="No exports yet"
        description="When you export lead lists, company data, or campaign reports they will appear here for download."
      />
    </div>
  );
}
