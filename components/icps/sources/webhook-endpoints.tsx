import { Plus } from "lucide-react";
import { WebhookEndpointCard } from "./webhook-endpoint-card";
import type { WebhookEndpoint } from "@/lib/types/pipeline";

export function WebhookEndpoints({ endpoints }: { endpoints: WebhookEndpoint[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-ink">Webhook Endpoints</h3>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle">
          <Plus size={12} strokeWidth={2} />
          Create Endpoint
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {endpoints.map((ep) => (
          <WebhookEndpointCard key={ep.id} endpoint={ep} />
        ))}
      </div>
    </div>
  );
}
