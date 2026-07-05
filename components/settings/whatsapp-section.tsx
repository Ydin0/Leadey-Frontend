"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getPhoneLines, autoAllocatePhoneLine } from "@/lib/api/phone-lines";
import type { PhoneLine } from "@/lib/types/calling";
import { NativeSelect } from "@/components/ui/native-select";
import {
  getWhatsappSettings,
  saveWhatsappSettings,
  getWhatsappConnectLink,
  disconnectWhatsappAccount,
  listWhatsappSenders,
  registerWhatsappSender,
  verifyWhatsappSender,
  refreshWhatsappSender,
  deleteWhatsappSender,
  listWhatsappContentTemplates,
  createWhatsappContentTemplate,
  type WhatsappSender,
  type WhatsappSettings,
  type WhatsappContentTemplate,
} from "@/lib/api/whatsapp";

const inputClass =
  "w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  online: "bg-signal-green/15 text-signal-green-text",
  pending_verification: "bg-signal-amber/15 text-signal-amber-text",
  verifying: "bg-signal-amber/15 text-signal-amber-text",
  creating: "bg-signal-slate/15 text-signal-slate-text",
  twilio_review: "bg-signal-slate/15 text-signal-slate-text",
  offline: "bg-signal-red/15 text-signal-red-text",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium rounded-full px-2 py-0.5 uppercase tracking-wide whitespace-nowrap",
        STATUS_STYLE[status] || "bg-signal-slate/15 text-signal-slate-text",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const APPROVAL_STYLE: Record<string, string> = {
  approved: "bg-signal-green/15 text-signal-green-text",
  pending: "bg-signal-amber/15 text-signal-amber-text",
  received: "bg-signal-amber/15 text-signal-amber-text",
  rejected: "bg-signal-red/15 text-signal-red-text",
};

/** One registered sender row: status badge, inline OTP verification while the
 *  number is pending, refresh (re-pull status from Twilio) and deregister. */
function SenderRow({
  sender,
  onChanged,
}: {
  sender: WhatsappSender;
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"verify" | "refresh" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsCode = sender.status === "pending_verification" || sender.status === "verifying";

  async function run(kind: "verify" | "refresh" | "delete", fn: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
          <MessageCircle size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-medium text-ink tabular-nums">{sender.number}</span>
            <StatusBadge status={sender.status} />
            {sender.lineReleased && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-red/15 text-signal-red-text">
                Line released
              </span>
            )}
          </div>
          {sender.lineName && <p className="text-[11px] text-ink-muted truncate">{sender.lineName}</p>}
          {sender.lastError && <p className="text-[10.5px] text-signal-red-text mt-0.5">{sender.lastError}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title="Refresh status from Twilio"
            onClick={() => void run("refresh", () => refreshWhatsappSender(sender.id))}
            className="flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            {busy === "refresh" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
          <button
            type="button"
            title="Deregister WhatsApp sender"
            onClick={() => setConfirming((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {needsCode && (
        <div className="flex items-center gap-1.5 mt-2.5 ml-11">
          <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-muted shrink-0">
            <Loader2 size={10} className="animate-spin" /> Verifying automatically…
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Or enter the code manually"
            className={cn(inputClass, "max-w-[220px]")}
          />
          <button
            type="button"
            onClick={() => void run("verify", () => verifyWhatsappSender(sender.id, code.trim()))}
            disabled={!code.trim() || busy === "verify"}
            className="flex items-center gap-1 px-3 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy === "verify" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Verify
          </button>
        </div>
      )}

      {confirming && (
        <div className="mt-2.5 ml-11 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
          <span className="text-[10px] text-signal-red-text leading-snug">
            Deregister <strong>{sender.number}</strong> from WhatsApp? Sends from this number will stop working.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy === "delete"}
              className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover border border-border-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void run("delete", () => deleteWhatsappSender(sender.id))}
              disabled={busy === "delete"}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 disabled:opacity-50"
            >
              {busy === "delete" ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
              Deregister
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10.5px] text-signal-red-text mt-1.5 ml-11">{error}</p>}
    </div>
  );
}

export function WhatsappSection() {
  const isAuthReady = useAuthReady();
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [wabaDraft, setWabaDraft] = useState("");
  const [savingWaba, setSavingWaba] = useState(false);
  const [wabaSaved, setWabaSaved] = useState(false);

  const [senders, setSenders] = useState<WhatsappSender[]>([]);
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [templates, setTemplates] = useState<WhatsappContentTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  // "Enable WhatsApp on a line" form.
  const [enableLineId, setEnableLineId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [senderError, setSenderError] = useState<string | null>(null);

  // Template create form.
  const [tplName, setTplName] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplCategory, setTplCategory] = useState("UTILITY");
  const [creatingTpl, setCreatingTpl] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, snd, ls, tpl] = await Promise.all([
        getWhatsappSettings(),
        listWhatsappSenders(),
        getPhoneLines().catch(() => [] as PhoneLine[]),
        listWhatsappContentTemplates().catch(() => [] as WhatsappContentTemplate[]),
      ]);
      setSettings(s);
      setWabaDraft(s.wabaId);
      setSenders(snd);
      setLines(ls);
      setTemplates(tpl);
    } catch {
      // leave prior state
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  // Returning from the hosted QR page (?whatsapp_connected=1 / _error=1):
  // surface the outcome and clean the URL — same pattern as email accounts.
  const [connectResult, setConnectResult] = useState<"connected" | "error" | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("whatsapp_connected")) setConnectResult("connected");
    else if (params.get("whatsapp_error")) setConnectResult("error");
    if (params.get("whatsapp_connected") || params.get("whatsapp_error")) {
      window.history.replaceState(null, "", "/dashboard/settings?tab=whatsapp");
    }
  }, []);

  // The hosted-auth notify webhook can land moments after the redirect —
  // poll briefly until the connection shows up.
  const unipileConnected = !!settings?.unipile.connected;
  useEffect(() => {
    if (connectResult !== "connected" || unipileConnected) return;
    const t = setInterval(() => {
      getWhatsappSettings().then(setSettings).catch(() => {});
    }, 3000);
    const stop = setTimeout(() => clearInterval(t), 60_000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [connectResult, unipileConnected]);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  async function startConnect() {
    setConnecting(true);
    try {
      const { url } = await getWhatsappConnectLink();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectWhatsappAccount();
      setConnectResult(null);
      getWhatsappSettings().then(setSettings).catch(() => {});
    } finally {
      setDisconnecting(false);
      setConfirmingDisconnect(false);
    }
  }

  const reloadSenders = useCallback(() => {
    listWhatsappSenders().then(setSenders).catch(() => {});
  }, []);

  // While a registration is in flight (verification is normally completed
  // automatically server-side within seconds), poll so the row flips to
  // "online" without a manual refresh.
  const hasPending = senders.some((s) => ["creating", "pending_verification", "verifying", "twilio_review"].includes(s.status));
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(reloadSenders, 6000);
    return () => clearInterval(t);
  }, [hasPending, reloadSenders]);

  // Active lines that don't already have a WhatsApp registration.
  const eligibleLines = useMemo(() => {
    const taken = new Set(senders.map((s) => s.number.replace(/\D/g, "")));
    return lines.filter((l) => l.status === "active" && !taken.has(l.number.replace(/\D/g, "")));
  }, [lines, senders]);

  const wabaSet = !!settings?.wabaConfigured || !!settings?.sandbox;

  async function saveWaba() {
    setSavingWaba(true);
    try {
      await saveWhatsappSettings(wabaDraft.trim());
      setSettings((s) => (s ? { ...s, wabaId: wabaDraft.trim() } : s));
      setWabaSaved(true);
      setTimeout(() => setWabaSaved(false), 2000);
    } catch {
      // keep draft for retry
    } finally {
      setSavingWaba(false);
    }
  }

  async function enableOnLine() {
    if (!enableLineId) return;
    setRegistering(true);
    setSenderError(null);
    try {
      await registerWhatsappSender({ lineId: enableLineId, displayName: displayName.trim() || undefined });
      setEnableLineId("");
      setDisplayName("");
      reloadSenders();
    } catch (err) {
      setSenderError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  // Buy a fresh number then immediately register it as a WhatsApp sender.
  async function provisionNew() {
    setProvisioning(true);
    setSenderError(null);
    try {
      const line = await autoAllocatePhoneLine({ countryCode: "US", type: "local" });
      await registerWhatsappSender({ lineId: line.id, displayName: displayName.trim() || undefined });
      getPhoneLines().then(setLines).catch(() => {});
      reloadSenders();
    } catch (err) {
      setSenderError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
  }

  async function createTemplate() {
    if (!tplName.trim() || !tplBody.trim()) return;
    setCreatingTpl(true);
    setTplError(null);
    try {
      await createWhatsappContentTemplate({ name: tplName.trim(), body: tplBody.trim(), category: tplCategory });
      setTplName("");
      setTplBody("");
      listWhatsappContentTemplates().then(setTemplates).catch(() => {});
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Template creation failed");
    } finally {
      setCreatingTpl(false);
    }
  }

  if (!loaded) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-6 flex items-center gap-2 text-[12px] text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading WhatsApp settings…
      </div>
    );
  }

  const showAdvanced = !!settings && !settings.unipile.connected && (settings.wabaConfigured || settings.sandbox || senders.length > 0);

  return (
    <div className="space-y-4">
      {settings?.sandbox && (
        <div className="flex items-start gap-2 rounded-[10px] bg-signal-amber/10 border border-signal-amber-text/20 px-3 py-2.5">
          <AlertTriangle size={13} className="text-signal-amber-text shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-signal-amber-text leading-snug">
            Sandbox mode is active — all WhatsApp sends use the shared Twilio sandbox number
            {settings.sandboxNumber ? ` (${settings.sandboxNumber})` : ""}. Recipients must first send the sandbox
            join code before they can receive messages.
          </p>
        </div>
      )}

      {/* ── Primary: the org's own WhatsApp, linked by QR scan ── */}
      <Card
        title="Connect your WhatsApp"
        description="Link your existing WhatsApp or WhatsApp Business number by scanning a QR code with your phone — done in under a minute. Messages send from your own number and replies land on the lead timeline and in your inbox."
      >
        {settings?.unipile.connected ? (
          <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-green/15 text-signal-green-text shrink-0">
                <MessageCircle size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-ink tabular-nums">
                    {settings.unipile.phone || "WhatsApp account"}
                  </span>
                  <span className="text-[10px] font-medium rounded-full px-2 py-0.5 uppercase tracking-wide bg-signal-green/15 text-signal-green-text">
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted">Workflows and manual sends use this number.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary border border-border-subtle text-[11px] font-medium hover:bg-hover shrink-0"
              >
                <Trash2 size={11} /> Disconnect
              </button>
            </div>
            {confirmingDisconnect && (
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-2.5 py-2">
                <span className="text-[10px] text-signal-red-text leading-snug">
                  Disconnect this WhatsApp? Workflow WhatsApp steps will fail until a number is connected again.
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setConfirmingDisconnect(false)}
                    disabled={disconnecting}
                    className="px-2 py-0.5 rounded-full bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover border border-border-subtle disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void disconnect()}
                    disabled={disconnecting}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red-text text-on-ink text-[10px] font-medium hover:bg-signal-red-text/90 disabled:opacity-50"
                  >
                    {disconnecting ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : connectResult === "connected" ? (
          <p className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <Loader2 size={13} className="animate-spin" /> Finishing the connection…
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {connectResult === "error" && (
              <p className="text-[11px] text-signal-red-text">
                The connection didn&apos;t complete — try again and keep the page open until the QR is scanned.
              </p>
            )}
            <div>
              <button
                type="button"
                onClick={() => void startConnect()}
                disabled={connecting || !settings?.unipile.available}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
                Connect WhatsApp
              </button>
            </div>
            {!settings?.unipile.available && (
              <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <Info size={12} className="shrink-0" /> WhatsApp connection isn&apos;t configured on this platform yet — contact support.
              </p>
            )}
            <p className="text-[10.5px] text-ink-faint">
              You&apos;ll be taken to a secure page showing a QR code — open WhatsApp on your phone → Settings →
              Linked devices → Link a device, and scan it. Best for conversational outreach at sane volumes.
            </p>
          </div>
        )}
      </Card>

      {showAdvanced && (
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium px-1 pt-2">
          Advanced — dedicated numbers (official WhatsApp Business API)
        </p>
      )}

      {/* The platform WABA covers everyone — this advanced card only appears
          when the platform isn't configured (dev / self-managed setups). */}
      {showAdvanced && !settings?.platformWabaConfigured && (
        <Card
          title="WhatsApp Business Account"
          description="Connect a WhatsApp Business Account to register numbers under. If you don't have one, contact support and we'll set it up for you."
        >
          <div className="flex items-center gap-2">
            <input
              value={wabaDraft}
              onChange={(e) => setWabaDraft(e.target.value)}
              placeholder="WhatsApp Business Account ID (WABA)"
              className={cn(inputClass, "max-w-[360px]")}
            />
            <button
              type="button"
              onClick={() => void saveWaba()}
              disabled={savingWaba || wabaDraft.trim() === (settings?.wabaId || "")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingWaba ? <Loader2 size={11} className="animate-spin" /> : wabaSaved ? <Check size={11} /> : null}
              {wabaSaved ? "Saved" : "Save"}
            </button>
          </div>
          {!wabaSet && (
            <p className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-2">
              <Info size={12} className="shrink-0" /> Number registration is disabled until WhatsApp is configured.
            </p>
          )}
        </Card>
      )}

      {showAdvanced && (
      <Card
        title="WhatsApp numbers"
        description="Phone numbers registered as WhatsApp senders. Registration and verification are handled automatically — a new number is usually online within a minute or two."
      >
        <div className="flex flex-col gap-2">
          {senders.length === 0 ? (
            <p className="text-[12px] text-ink-faint">No WhatsApp numbers registered yet.</p>
          ) : (
            senders.map((s) => <SenderRow key={s.id} sender={s} onChanged={reloadSenders} />)
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Enable WhatsApp on a number
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              className={cn(inputClass, "max-w-[260px]")}
              value={enableLineId}
              onChange={(e) => setEnableLineId(e.target.value)}
              disabled={!wabaSet}
            >
              <option value="">Choose an existing phone line…</option>
              {eligibleLines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.friendlyName ? `${l.friendlyName} · ${l.number}` : l.number}
                </option>
              ))}
            </NativeSelect>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (shown on WhatsApp)"
              disabled={!wabaSet}
              className={cn(inputClass, "max-w-[240px]")}
            />
            <button
              type="button"
              onClick={() => void enableOnLine()}
              disabled={!wabaSet || !enableLineId || registering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {registering ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
              Register
            </button>
            <span className="text-[11px] text-ink-faint">or</span>
            <button
              type="button"
              onClick={() => void provisionNew()}
              disabled={!wabaSet || provisioning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary border border-border-subtle text-[11px] font-medium hover:bg-hover disabled:opacity-50"
            >
              {provisioning ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Provision new number
            </button>
          </div>
          {senderError && <p className="text-[10.5px] text-signal-red-text mt-2">{senderError}</p>}
        </div>
      </Card>
      )}

      {showAdvanced && (
      <Card
        title="Message templates"
        description="Meta-approved templates are required for WhatsApp messages sent outside the 24-hour reply window (all cold/automated outreach). Approval is reviewed by Meta and usually takes minutes to a few hours."
      >
        <div className="flex flex-col gap-2 mb-4">
          {templates.length === 0 ? (
            <p className="text-[12px] text-ink-faint">No templates yet.</p>
          ) : (
            templates.map((t) => (
              <div key={t.sid} className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-ink">{t.name}</span>
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5 uppercase tracking-wide",
                      APPROVAL_STYLE[t.approvalStatus] || "bg-signal-slate/15 text-signal-slate-text",
                    )}
                  >
                    {t.approvalStatus}
                  </span>
                  <span className="text-[10.5px] text-ink-faint">{t.language}</span>
                </div>
                <p className="text-[11.5px] text-ink-secondary mt-1 whitespace-pre-wrap">{t.body}</p>
                {t.rejectionReason && (
                  <p className="text-[10.5px] text-signal-red-text mt-1">Rejected: {t.rejectionReason}</p>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">New template</p>
        <div className="flex flex-col gap-2 max-w-[520px]">
          <div className="flex items-center gap-2">
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="template_name (letters, numbers, underscores)"
              className={inputClass}
            />
            <NativeSelect className={cn(inputClass, "max-w-[150px]")} value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}>
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
            </NativeSelect>
          </div>
          <textarea
            value={tplBody}
            onChange={(e) => setTplBody(e.target.value)}
            placeholder={"Hi {{1}}, thanks for your interest in {{2}} — is now a good time to chat?"}
            className={cn(inputClass, "resize-none min-h-[80px] leading-relaxed")}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] text-ink-faint">
              Use numbered placeholders like {"{{1}}"} — you map them to lead fields when using the template.
            </p>
            <button
              type="button"
              onClick={() => void createTemplate()}
              disabled={creatingTpl || !tplName.trim() || !tplBody.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {creatingTpl ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Submit for approval
            </button>
          </div>
          {tplError && <p className="text-[10.5px] text-signal-red-text">{tplError}</p>}
        </div>
      </Card>
      )}
    </div>
  );
}
