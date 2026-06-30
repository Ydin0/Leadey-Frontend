"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail, Loader2, Plus, Trash2, Star, Server, CheckCircle2, AlertCircle, X, Calendar, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  listEmailAccounts, startEmailOAuth, connectSmtpAccount,
  setDefaultEmailAccount, disconnectEmailAccount,
} from "@/lib/api/email-accounts";
import {
  listCalendarAccounts, startCalendarOAuth, disconnectCalendarAccount,
} from "@/lib/api/calendar";
import type { EmailAccount } from "@/lib/types/email-accounts";
import type { CalendarAccount, CalendarAccountsResult } from "@/lib/types/calendar";

const PROVIDER_LABEL: Record<string, string> = { gmail: "Gmail", outlook: "Outlook", smtp: "SMTP" };
const CAL_PROVIDER_LABEL: Record<string, string> = { google: "Google Calendar", microsoft: "Outlook Calendar" };

export function EmailAccountsSection() {
  const isAuthReady = useAuthReady();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showSmtp, setShowSmtp] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cal, setCal] = useState<CalendarAccountsResult | null>(null);
  const [calLoaded, setCalLoaded] = useState(false);
  const [calError, setCalError] = useState(false);
  const [calConnecting, setCalConnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts(await listEmailAccounts());
      setEmailError(false);
    } catch {
      setEmailError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCal = useCallback(async () => {
    try {
      setCal(await listCalendarAccounts());
      setCalError(false);
    } catch {
      setCalError(true);
    } finally {
      setCalLoaded(true);
    }
  }, []);

  // Wait for the org-scoped auth token before hitting org-scoped endpoints —
  // otherwise, right after the OAuth redirect, these fire before the token is
  // ready and 403, leaving the lists empty/stuck. Re-runs once auth is ready.
  useEffect(() => {
    if (!isAuthReady) return;
    void load();
    void loadCal();
  }, [isAuthReady, load, loadCal]);

  // Surface the OAuth round-trip result and clean the URL.
  useEffect(() => {
    if (searchParams.get("connected")) {
      setToast({ type: "success", text: "Email account connected." });
    } else if (searchParams.get("error")) {
      setToast({ type: "error", text: `Couldn't connect: ${searchParams.get("error")}` });
    } else if (searchParams.get("calendar_connected")) {
      setToast({ type: "success", text: "Calendar connected." });
    } else if (searchParams.get("calendar_error")) {
      setToast({ type: "error", text: `Couldn't connect calendar: ${searchParams.get("calendar_error")}` });
    }
    if (["connected", "error", "calendar_connected", "calendar_error"].some((k) => searchParams.get(k))) {
      window.history.replaceState(null, "", "/dashboard/settings?tab=email-accounts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectOAuth = useCallback(async (provider: "google" | "microsoft") => {
    setConnecting(provider);
    try {
      const url = await startEmailOAuth(provider);
      window.location.href = url; // provider consent → redirects back to settings
    } catch (err) {
      setConnecting(null);
      setToast({ type: "error", text: err instanceof Error ? err.message : "Could not start connection" });
    }
  }, []);

  const connectCalendar = useCallback(async (provider: "google" | "microsoft") => {
    setCalConnecting(provider);
    try {
      const url = await startCalendarOAuth(provider);
      window.location.href = url;
    } catch (err) {
      setCalConnecting(null);
      setToast({ type: "error", text: err instanceof Error ? err.message : "Could not start calendar connection" });
    }
  }, []);

  async function disconnectCal(id: string) {
    if (!confirm("Disconnect this calendar? Upcoming meetings from it will stop showing on lead profiles.")) return;
    setCal((prev) => (prev ? { ...prev, accounts: prev.accounts.filter((a) => a.id !== id) } : prev));
    try { await disconnectCalendarAccount(id); } catch { void loadCal(); }
  }

  async function makeDefault(id: string) {
    setAccounts((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    try { await setDefaultEmailAccount(id); } catch { void load(); }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this email account? You'll stop sending and receiving from it in Leadey.")) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    try { await disconnectEmailAccount(id); } catch { void load(); }
  }

  return (
    <div className="space-y-4">
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Email Accounts</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Connect your inbox to send 1:1 emails from your real address. Replies and opens are tracked back to the lead.
            </p>
          </div>
        </div>

        {toast && (
          <div className={cn(
            "mb-4 flex items-center gap-2 px-3 py-2 rounded-[10px] text-[11px] border",
            toast.type === "success"
              ? "bg-signal-green/10 border-signal-green-text/20 text-signal-green-text"
              : "bg-signal-red/10 border-signal-red-text/20 text-signal-red-text",
          )}>
            {toast.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span className="flex-1">{toast.text}</span>
            <button onClick={() => setToast(null)}><X size={12} /></button>
          </div>
        )}

        {/* Connect buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ConnectButton label="Connect Gmail" busy={connecting === "google"} onClick={() => void connectOAuth("google")} />
          <ConnectButton label="Connect Outlook" busy={connecting === "microsoft"} onClick={() => void connectOAuth("microsoft")} />
          <button
            type="button"
            onClick={() => setShowSmtp(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-section border border-border-subtle text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <Server size={13} /> Connect via SMTP
          </button>
        </div>

        {/* Accounts list */}
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-ink-muted py-4">
            <Loader2 size={13} className="animate-spin" /> Loading accounts…
          </div>
        ) : emailError && accounts.length === 0 ? (
          <LoadErrorBox label="Couldn't load your email accounts." onRetry={() => void load()} />
        ) : accounts.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border-default bg-section/30 px-4 py-6 text-center">
            <Mail size={20} className="text-ink-faint mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[12px] text-ink-muted">No email accounts connected yet.</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Connect one above to start emailing leads from your inbox.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] border border-border-subtle bg-section/30">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-blue/15 text-signal-blue-text shrink-0">
                  <Mail size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-ink truncate">{a.email}</p>
                    {a.isDefault && (
                      <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-green-text bg-signal-green/15 rounded-full px-1.5 py-0.5">Default</span>
                    )}
                  </div>
                  <p className="text-[10px] text-ink-muted">
                    {PROVIDER_LABEL[a.provider] || a.provider}
                    {a.fromName ? ` · ${a.fromName}` : ""}
                    {a.status !== "active" ? ` · ${a.status}` : ""}
                  </p>
                </div>
                <span className={cn(
                  "text-[10px] font-medium rounded-full px-2 py-0.5",
                  a.status === "active" ? "bg-signal-green text-signal-green-text" : "bg-signal-red/15 text-signal-red-text",
                )}>
                  {a.status === "active" ? "Connected" : a.status}
                </span>
                {!a.isDefault && (
                  <button onClick={() => void makeDefault(a.id)} title="Set as default" className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => void disconnect(a.id)} title="Disconnect" className="p-1.5 rounded-md text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calendars — connect Google/Outlook calendar so upcoming meetings appear on lead profiles */}
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Calendars</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Connect your Google or Outlook calendar. We detect meetings with your leads and show them on the lead&apos;s profile.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ConnectButton
            label="Connect Google Calendar"
            busy={calConnecting === "google"}
            disabled={cal ? !cal.platformConfigured.google : false}
            onClick={() => void connectCalendar("google")}
          />
          <ConnectButton
            label="Connect Outlook Calendar"
            busy={calConnecting === "microsoft"}
            disabled={cal ? !cal.platformConfigured.microsoft : false}
            onClick={() => void connectCalendar("microsoft")}
          />
        </div>

        {!calLoaded ? (
          <div className="flex items-center gap-2 text-[11px] text-ink-muted py-4">
            <Loader2 size={13} className="animate-spin" /> Loading calendars…
          </div>
        ) : calError || !cal ? (
          <LoadErrorBox label="Couldn't load your calendars." onRetry={() => { setCalLoaded(false); void loadCal(); }} />
        ) : cal.accounts.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border-default bg-section/30 px-4 py-6 text-center">
            <Calendar size={20} className="text-ink-faint mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[12px] text-ink-muted">No calendars connected yet.</p>
            <p className="text-[11px] text-ink-faint mt-0.5">Connect one above to see upcoming meetings on lead profiles.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cal.accounts.map((a: CalendarAccount) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] border border-border-subtle bg-section/30">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-signal-blue/15 text-signal-blue-text shrink-0">
                  <Calendar size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-ink truncate">{a.email}</p>
                  <p className="text-[10px] text-ink-muted">
                    {CAL_PROVIDER_LABEL[a.provider] || a.provider}
                    {a.status !== "active" ? ` · ${a.status}` : ""}
                  </p>
                </div>
                <span className={cn(
                  "text-[10px] font-medium rounded-full px-2 py-0.5",
                  a.status === "active" ? "bg-signal-green text-signal-green-text" : "bg-signal-red/15 text-signal-red-text",
                )}>
                  {a.status === "active" ? "Connected" : a.status}
                </span>
                <button onClick={() => void disconnectCal(a.id)} title="Disconnect" className="p-1.5 rounded-md text-ink-muted hover:bg-signal-red/10 hover:text-signal-red-text transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showSmtp && (
        <SmtpConnectModal
          onClose={() => setShowSmtp(false)}
          onConnected={() => { setShowSmtp(false); setToast({ type: "success", text: "SMTP account connected." }); void load(); }}
        />
      )}
    </div>
  );
}

function LoadErrorBox({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-[10px] border border-signal-red-text/20 bg-signal-red/10 px-4 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle size={14} className="text-signal-red-text shrink-0" />
        <p className="text-[11.5px] text-signal-red-text truncate">{label} Make sure the right workspace is selected, then retry.</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] bg-surface border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors shrink-0"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

function ConnectButton({ label, busy, disabled, onClick }: { label: string; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      title={disabled ? "Not configured on the server yet" : undefined}
      className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
      {label}
    </button>
  );
}

function SmtpConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [form, setForm] = useState({
    fromName: "", email: "", smtpHost: "", smtpPort: "587", username: "", password: "",
    imapHost: "", imapPort: "993",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const port = Number(form.smtpPort) || 587;
      await connectSmtpAccount({
        email: form.email.trim(),
        fromName: form.fromName.trim() || undefined,
        username: form.username.trim() || undefined,
        password: form.password,
        smtpHost: form.smtpHost.trim(),
        smtpPort: port,
        smtpSecure: port === 465,
        imapHost: form.imapHost.trim() || undefined,
        imapPort: Number(form.imapPort) || 993,
      });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h3 className="text-[13px] font-semibold text-ink">Connect via SMTP</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <Row label="Your name"><Input value={form.fromName} onChange={set("fromName")} placeholder="Jane from Acme" /></Row>
          <Row label="Email address"><Input value={form.email} onChange={set("email")} placeholder="jane@acme.com" /></Row>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <Row label="SMTP host"><Input value={form.smtpHost} onChange={set("smtpHost")} placeholder="smtp.gmail.com" /></Row>
            <Row label="Port"><Input value={form.smtpPort} onChange={set("smtpPort")} placeholder="587" /></Row>
          </div>
          <Row label="Username (if different from email)"><Input value={form.username} onChange={set("username")} placeholder="optional" /></Row>
          <Row label="Password / app password"><Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" /></Row>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <Row label="IMAP host (for replies)"><Input value={form.imapHost} onChange={set("imapHost")} placeholder="imap.gmail.com" /></Row>
            <Row label="Port"><Input value={form.imapPort} onChange={set("imapPort")} placeholder="993" /></Row>
          </div>
          {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
          <button onClick={onClose} disabled={busy} className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50">Cancel</button>
          <button
            onClick={() => void submit()}
            disabled={busy || !form.email || !form.password || !form.smtpHost}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Test &amp; Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-signal-blue-text/40"
    />
  );
}
