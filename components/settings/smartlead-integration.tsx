"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSmartleadStatus,
  connectSmartlead,
  disconnectSmartlead,
  getSmartleadEmailAccounts,
  saveSmartleadEmailAccounts,
  type SmartleadEmailAccountItem,
} from "@/lib/api/settings";

export function SmartleadIntegration() {
  const [connected, setConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<SmartleadEmailAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [savingAccounts, setSavingAccounts] = useState(false);

  useEffect(() => {
    getSmartleadStatus()
      .then((status) => {
        setConnected(status.connected);
        setMaskedKey(status.maskedKey);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (connected) {
      setLoadingAccounts(true);
      getSmartleadEmailAccounts()
        .then((result) => setAccounts(result.accounts))
        .catch(() => {})
        .finally(() => setLoadingAccounts(false));
    }
  }, [connected]);

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    setError(null);
    setSuccess(null);
    setConnecting(true);
    try {
      const result = await connectSmartlead(apiKey.trim());
      setConnected(result.connected);
      setMaskedKey(result.maskedKey);
      setApiKey("");
      setSuccess("Connected successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setSuccess(null);
    setDisconnecting(true);
    try {
      await disconnectSmartlead();
      setConnected(false);
      setMaskedKey(null);
      setAccounts([]);
      setSuccess("Disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  function toggleAccountSelection(accountId: number) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, selected: !a.selected } : a,
      ),
    );
  }

  async function handleSaveAccounts() {
    setSavingAccounts(true);
    setError(null);
    try {
      const selectedIds = accounts.filter((a) => a.selected).map((a) => a.id);
      await saveSmartleadEmailAccounts(selectedIds);
      setSuccess("Email accounts saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save accounts");
    } finally {
      setSavingAccounts(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <Loader2 size={13} className="animate-spin" />
          Loading Smartlead status...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-ink font-medium">Smartlead</p>
            <p className="text-[11px] text-ink-muted">
              {connected
                ? `Connected ${maskedKey ? `(${maskedKey})` : ""}`
                : "Not connected"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-medium rounded-full px-2 py-0.5",
                connected
                  ? "bg-signal-green text-signal-green-text"
                  : "bg-signal-slate text-signal-slate-text",
              )}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>
            {connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                {disconnecting ? "..." : "Disconnect"}
              </button>
            )}
          </div>
        </div>

        {/* Connect form (when not connected) */}
        {!connected && (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Smartlead API key"
                className="w-full px-3 py-2 pr-9 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-faint hover:text-ink-muted"
              >
                {showKey ? (
                  <EyeOff size={13} strokeWidth={1.5} />
                ) : (
                  <Eye size={13} strokeWidth={1.5} />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Testing...
                </>
              ) : (
                "Test & Connect"
              )}
            </button>
          </div>
        )}

        {/* Status messages */}
        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-signal-red-text">
            <X size={12} strokeWidth={2} />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-signal-green-text">
            <Check size={12} strokeWidth={2} />
            {success}
          </div>
        )}
      </div>

      {/* Email accounts (when connected) */}
      {connected && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
              Sending Accounts
            </p>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAccounts}
                disabled={savingAccounts}
                className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {savingAccounts ? "Saving..." : "Save Selection"}
              </button>
            )}
          </div>

          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-[11px] text-ink-muted py-2">
              <Loader2 size={12} className="animate-spin" />
              Loading email accounts...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-[11px] text-ink-muted py-1">
              No email accounts found in Smartlead
            </p>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-hover cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={account.selected}
                    onChange={() => toggleAccountSelection(account.id)}
                    className="rounded border-border-default accent-signal-blue-text"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink truncate">{account.email}</p>
                    {account.fromName && (
                      <p className="text-[10px] text-ink-muted truncate">
                        {account.fromName}
                      </p>
                    )}
                  </div>
                  {!account.isActive && (
                    <span className="text-[9px] text-signal-red-text font-medium">
                      Inactive
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
