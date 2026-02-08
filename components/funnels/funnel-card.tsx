import Link from "next/link";
import { Users, MessageSquare, CheckCircle, ArrowRight } from "lucide-react";
import { FunnelStatusBadge } from "./funnel-status-badge";
import { FunnelStepPipeline } from "./dashboard/funnel-step-pipeline";
import type { Funnel } from "@/lib/types/funnel";

export function FunnelCard({ funnel }: { funnel: Funnel }) {
  return (
    <Link
      href={`/dashboard/funnels/${funnel.id}`}
      className="bg-surface rounded-[14px] border border-border-subtle p-5 transition-colors hover:border-border-default group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[14px] font-semibold text-ink">{funnel.name}</h3>
          <FunnelStatusBadge status={funnel.status} />
        </div>
        <ArrowRight size={14} strokeWidth={1.5} className="text-ink-faint group-hover:text-ink-secondary transition-colors" />
      </div>

      {/* Description */}
      <p className="text-[11px] text-ink-muted mb-3">{funnel.description}</p>

      {/* Step Pipeline */}
      <div className="mb-4">
        <FunnelStepPipeline steps={funnel.steps} compact />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Users size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{funnel.metrics.total}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{funnel.metrics.active}</span> active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{funnel.metrics.replyRate}%</span> reply rate
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={13} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[12px] text-ink-secondary">
            <span className="font-medium text-ink">{funnel.metrics.completed}</span> completed
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {funnel.sources.map((src) => (
            <span key={src.label} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted">
              {src.label} ({src.count})
            </span>
          ))}
          {funnel.sources.length === 0 && (
            <span className="text-[10px] text-ink-faint italic">No sources</span>
          )}
        </div>
        <span className="text-[10px] text-ink-faint shrink-0">
          {funnel.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>
    </Link>
  );
}
