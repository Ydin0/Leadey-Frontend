"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Webhook, Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFunnelById, updateFunnelWebhook } from "@/lib/api/funnels";
import { useCustomFields } from "@/lib/hooks/use-custom-fields";
import type { Funnel } from "@/lib/types/funnel";

/** Standard lead fields a payload key can map to. */
const STANDARD_TARGETS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
  { value: "phone", label: "Phone" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
];

/** Sentinel target meaning "create a brand-new custom field for this key". */
const NEW_CUSTOM = "__new_custom__";

/** Mirror of the backend slugifyFieldKey so the custom key we send matches. */
function slugifyKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

type MappingRow = { payloadKey: string; target: string; newLabel?: string };

export function WebhookFlow({
  funnelId,
  onDone,
}: {
  funnelId: string;
  onDone: () => void;
}) {
  const { fields: customFields, reload: reloadCustomFields } = useCustomFields();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const f = await getFunnelById(funnelId);
        if (!mounted) return;
        setFunnel(f);
        setRows(
          Object.entries(f.webhookFieldMap || {}).map(([payloadKey, target]) => ({
            payloadKey,
            target,
          })),
        );
      } catch (err) {
        if (mounted)
          setError(err instanceof Error ? err.message : "Failed to load webhook");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [funnelId]);

  const targetOptions = useMemo(
    () => [
      ...STANDARD_TARGETS,
      ...customFields.map((f) => ({
        value: `custom:${f.key}`,
        label: `${f.label} (custom)`,
      })),
      { value: NEW_CUSTOM, label: "➕ New custom field…" },
    ],
    [customFields],
  );

  const webhookUrl =
    funnel?.webhookUrl ||
    (funnel?.webhookToken
      ? `${(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")}/webhooks/funnels/${funnel.id}/leads?token=${funnel.webhookToken}`
      : "");

  function handleCopy() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function patch(payload: Parameters<typeof updateFunnelWebhook>[1]) {
    if (!funnel) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateFunnelWebhook(funnel.id, payload);
      setFunnel(updated);
      setRows(
        Object.entries(updated.webhookFieldMap || {}).map(([payloadKey, target]) => ({
          payloadKey,
          target,
        })),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // The backend auto-creates any newly-mapped custom field — refresh the
      // list so it shows as a normal option (with its label) next time.
      void reloadCustomFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update webhook");
    } finally {
      setBusy(false);
    }
  }

  function saveMapping() {
    const fieldMap: Record<string, string> = {};
    for (const row of rows) {
      const k = row.payloadKey.trim();
      if (!k) continue;
      // A "new custom field" row resolves to custom:<slug-of-the-typed-name>;
      // the backend provisions the definition on save.
      let target = row.target;
      if (target === NEW_CUSTOM) {
        const slug = slugifyKey(row.newLabel || row.payloadKey);
        if (!slug) continue;
        target = `custom:${slug}`;
      }
      if (target) fieldMap[k] = target;
    }
    void patch({ fieldMap });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const enabled = !!funnel?.webhookEnabled;

  // Build a payload example from the configured mapping (or sensible defaults).
  const exampleKeys =
    rows.length > 0
      ? rows.map((r) => r.payloadKey).filter(Boolean)
      : ["first_name", "last_name", "email", "phone_number", "company_name", "job_title"];
  const payloadExample = `{\n${exampleKeys
    .map((k) => `  "${k}": "…"`)
    .join(",\n")}\n}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-ink">Webhook Integration</h3>
        <button
          onClick={() => patch({ enabled: !enabled })}
          disabled={busy}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors disabled:opacity-50",
            enabled
              ? "bg-signal-green text-signal-green-text"
              : "bg-section border border-border-subtle text-ink-secondary hover:bg-hover",
          )}
        >
          {busy && <Loader2 size={11} className="animate-spin" />}
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {/* Webhook URL */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Webhook URL
        </span>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 px-3 py-2 bg-section rounded-[10px] border border-border-subtle">
            <code className="text-[11px] text-ink font-mono break-all">
              {webhookUrl || "Save the campaign to generate a webhook URL"}
            </code>
          </div>
          <button
            onClick={handleCopy}
            disabled={!webhookUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[20px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => patch({ rotateToken: true })}
            disabled={busy}
            title="Regenerate token"
            className="flex items-center gap-1.5 px-3 py-2 rounded-[20px] bg-section border border-border-subtle text-[10px] font-medium text-ink-secondary hover:bg-hover transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Rotate
          </button>
        </div>
        <p className="text-[10px] text-ink-faint mt-1.5">
          Send a <span className="font-medium">POST</span> with a JSON body. The
          token authenticates the request — rotating it invalidates the old URL.
          Works with Zapier → Facebook Lead Ads: map your form fields (including
          custom questions) to the keys below.
        </p>
      </div>

      {/* Field mapping */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Field Mapping
        </span>
        <p className="text-[10px] text-ink-faint mt-0.5 mb-2">
          Map keys from your payload to lead fields. Unmapped keys matching a
          standard field name are used automatically.
        </p>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.payloadKey}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, payloadKey: e.target.value } : r,
                    ),
                  )
                }
                placeholder="payload key (e.g. funding_stage)"
                className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <span className="text-ink-faint text-[12px]">→</span>
              <select
                value={row.target}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, j) =>
                      j === i ? { ...r, target: e.target.value } : r,
                    ),
                  )
                }
                className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
              >
                <option value="">Select field…</option>
                {targetOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {row.target === NEW_CUSTOM && (
                <input
                  value={row.newLabel ?? ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, newLabel: e.target.value } : r)),
                    )
                  }
                  placeholder="new field name"
                  className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
                />
              )}
              <button
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                title="Remove mapping"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setRows((prev) => [...prev, { payloadKey: "", target: "" }])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
          >
            <Plus size={12} />
            Add mapping
          </button>
          <button
            onClick={saveMapping}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Save mapping
          </button>
          {saved && (
            <span className="text-[11px] text-signal-green-text">Saved.</span>
          )}
          {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
        </div>
      </div>

      {/* Payload Format */}
      <div className="mb-5">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
          Payload Format (JSON)
        </span>
        <pre className="mt-1.5 px-4 py-3 bg-section rounded-[10px] border border-border-subtle overflow-x-auto">
          <code className="text-[11px] text-ink font-mono">{payloadExample}</code>
        </pre>
      </div>

      {/* Status */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-[10px] border mb-4",
          enabled
            ? "bg-signal-green/10 border-signal-green-text/20"
            : "bg-section border-border-subtle",
        )}
      >
        <Webhook
          size={13}
          className={enabled ? "text-signal-green-text" : "text-ink-muted"}
        />
        <span
          className={cn(
            "text-[11px] font-medium",
            enabled ? "text-signal-green-text" : "text-ink-muted",
          )}
        >
          {enabled
            ? "Webhook is active and listening"
            : "Webhook is disabled — enable it to accept leads"}
        </span>
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
