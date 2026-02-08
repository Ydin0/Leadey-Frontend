"use client";

import { useState } from "react";
import { Copy, Check, Webhook } from "lucide-react";

const WEBHOOK_URL = "https://api.leadey.com/v1/funnels/funnel_001/leads/inbound";

const PAYLOAD_EXAMPLE = `{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "title": "VP of Sales"
}`;

export function WebhookFlow({ onDone }: { onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-ink mb-4">Webhook Integration</h3>

      {/* Webhook URL */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Webhook URL</span>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 px-3 py-2 bg-section rounded-[10px] border border-border-subtle">
            <code className="text-[11px] text-ink font-mono break-all">{WEBHOOK_URL}</code>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[20px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors shrink-0"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Payload Format */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Payload Format (JSON)</span>
        <pre className="mt-1.5 px-4 py-3 bg-section rounded-[10px] border border-border-subtle overflow-x-auto">
          <code className="text-[11px] text-ink font-mono">{PAYLOAD_EXAMPLE}</code>
        </pre>
      </div>

      {/* Zapier Guide */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Quick Setup with Zapier</span>
        <ol className="mt-2 space-y-2">
          {[
            "Create a new Zap with your trigger app (e.g., Typeform, HubSpot)",
            "Add a \"Webhooks by Zapier\" action step",
            "Select \"POST\" method and paste the webhook URL above",
            "Map your trigger fields to the JSON payload format",
            "Test the Zap and publish",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-ink-secondary">
              <span className="text-[10px] font-medium text-ink-muted bg-section rounded-full w-5 h-5 flex items-center justify-center shrink-0">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-signal-green/10 rounded-[10px] border border-signal-green-text/20 mb-4">
        <Webhook size={13} className="text-signal-green-text" />
        <span className="text-[11px] text-signal-green-text font-medium">Webhook is active and listening</span>
      </div>

      <button
        onClick={onDone}
        className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
