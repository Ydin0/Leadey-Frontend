import type { ProvisionWizardData } from "@/lib/types/calling";

interface StepReviewConfirmProps {
  data: ProvisionWizardData;
}

export function StepReviewConfirm({ data }: StepReviewConfirmProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Review &amp; Confirm</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">Review your selections before provisioning.</p>
      </div>

      <div className="rounded-[10px] border border-border-subtle bg-section/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">Number</span>
          <span className="text-[12px] font-medium text-ink">{data.selectedNumber?.number ?? "—"}</span>
        </div>

        <div className="h-px bg-border-subtle" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">Country</span>
          <span className="text-[12px] text-ink">
            {data.country?.flag} {data.country?.name ?? "—"}
          </span>
        </div>

        <div className="h-px bg-border-subtle" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">Type</span>
          <span className="text-[12px] text-ink">{data.type ?? "—"}</span>
        </div>

        <div className="h-px bg-border-subtle" />

        {data.bundleId && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-muted">Regulatory Bundle</span>
              <span className="text-[12px] text-ink">{data.bundleId}</span>
            </div>
            <div className="h-px bg-border-subtle" />
          </>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">Monthly Cost</span>
          <span className="text-[14px] font-semibold text-ink">
            ${data.selectedNumber?.monthlyCost.toFixed(2) ?? "—"}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
