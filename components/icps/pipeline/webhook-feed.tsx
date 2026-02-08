import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { WebhookEvent } from "@/lib/types/pipeline";

export function WebhookFeed({ events }: { events: WebhookEvent[] }) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Webhook Ingest</h3>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-green-text opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-signal-green-text" />
          </span>
        </div>
        <span className="text-[10px] text-signal-green-text font-medium">Listening</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              event.status === "entered_funnel" ? "bg-signal-green-text" : "bg-ink-faint"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink">{event.lead}</span>
                <span className="text-[10px] text-ink-faint">{event.company}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-ink-muted">{event.source}</span>
                <span className="text-[10px] text-ink-faint">&middot;</span>
                <span className={cn(
                  "text-[10px]",
                  event.status === "entered_funnel" ? "text-signal-green-text" : "text-ink-faint"
                )}>
                  {event.status === "entered_funnel" ? event.funnel : "Duplicate skipped"}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-ink-faint whitespace-nowrap shrink-0">
              {formatRelativeTime(event.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
