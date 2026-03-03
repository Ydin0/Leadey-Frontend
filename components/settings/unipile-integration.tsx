"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Check, X, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUnipileStatus,
  disconnectUnipile,
  getUnipileAccounts,
  selectUnipileAccount,
  connectLinkedInAccount,
  resolveCheckpoint,
  type UnipileAccountItem,
} from "@/lib/api/unipile";

type Phase = "loading" | "connect" | "checkpoint" | "select-account" | "done";

export function UnipileIntegration() {
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  // LinkedIn auth form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkpointAccountId, setCheckpointAccountId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Accounts
  const [accounts, setAccounts] = useState<UnipileAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
  const [resolvingCheckpoint, setResolvingCheckpoint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  // On mount: check status AND fetch existing accounts
  useEffect(() => {
    async function init() {
      try {
        const status = await getUnipileStatus();
        setPlatformConfigured(status.platformConfigured);
        setConnected(status.connected);
        setAccountName(status.accountName);

        if (status.connected && status.accountId) {
          // Already fully connected
          setSelectedAccountId(status.accountId);
          setPhase("done");
          // Still fetch accounts list for the UI
          try {
            const result = await getUnipileAccounts();
            setAccounts(result.accounts);
          } catch {}
        } else if (status.platformConfigured) {
          // Platform configured but no account selected - check if any exist
          try {
            const result = await getUnipileAccounts();
            setAccounts(result.accounts);
            if (result.accounts.length > 0) {
              // Accounts exist on Unipile - show selection
              setPhase("select-account");
            } else {
              setPhase("connect");
            }
          } catch {
            setPhase("connect");
          }
        } else {
          setPhase("connect");
        }
      } catch {
        setPhase("connect");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function refreshAccounts() {
    setLoadingAccounts(true);
    try {
      const result = await getUnipileAccounts();
      setAccounts(result.accounts);
    } catch {}
    setLoadingAccounts(false);
  }

  async function handleConnectLinkedIn() {
    if (!username.trim() || !password.trim()) {
      setError("LinkedIn email and password are required");
      return;
    }
    setError(null);
    setSuccess(null);
    setConnectingLinkedIn(true);
    try {
      const result = await connectLinkedInAccount(username.trim(), password.trim());
      if (result.checkpoint) {
        setCheckpointAccountId(result.account_id);
        setPhase("checkpoint");
        setSuccess("Verification required - enter the code or approve on the LinkedIn app");
      } else {
        setSuccess("LinkedIn account connected");
        await refreshAccounts();
        setPhase("select-account");
      }
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect LinkedIn account");
    } finally {
      setConnectingLinkedIn(false);
    }
  }

  async function handleResolveCheckpoint() {
    if (!otpCode.trim()) {
      setError("Enter the verification code");
      return;
    }
    setError(null);
    setResolvingCheckpoint(true);
    try {
      await resolveCheckpoint(checkpointAccountId, otpCode.trim());
      setOtpCode("");
      setSuccess("LinkedIn account verified");
      await refreshAccounts();
      setPhase("select-account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setResolvingCheckpoint(false);
    }
  }

  // "I approved it on the LinkedIn app" - skip checkpoint and check for accounts
  async function handleSkipCheckpoint() {
    setError(null);
    setSuccess(null);
    setLoadingAccounts(true);
    try {
      const result = await getUnipileAccounts();
      setAccounts(result.accounts);
      if (result.accounts.length > 0) {
        setPhase("select-account");
        setSuccess("Account found - select it below");
      } else {
        setError("No accounts found yet. LinkedIn may still be processing - try again in a moment.");
      }
    } catch {
      setError("Could not check accounts. Try again.");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function handleSelectAccount(account: UnipileAccountItem) {
    setSavingAccount(true);
    setError(null);
    try {
      await selectUnipileAccount(account.id, account.name);
      setSelectedAccountId(account.id);
      setAccountName(account.name);
      setConnected(true);
      setPhase("done");
      setSuccess("LinkedIn account activated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select account");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setSuccess(null);
    setDisconnecting(true);
    try {
      await disconnectUnipile();
      setConnected(false);
      setAccountName(null);
      setSelectedAccountId(null);
      // Keep accounts list - they still exist on Unipile
      setPhase(accounts.length > 0 ? "select-account" : "connect");
      setSuccess("LinkedIn account disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          <Loader2 size={13} className="animate-spin" />
          Loading LinkedIn status...
        </div>
      </div>
    );
  }

  // Platform credentials not configured
  if (!platformConfigured) {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-ink font-medium">LinkedIn Automation</p>
            <p className="text-[11px] text-ink-muted">
              Platform not configured. Contact your administrator.
            </p>
          </div>
          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-slate text-signal-slate-text">
            Unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection status header */}
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin size={14} strokeWidth={1.5} className="text-linkedin" />
            <div>
              <p className="text-[12px] text-ink font-medium">LinkedIn Automation</p>
              <p className="text-[11px] text-ink-muted">
                {phase === "done" && accountName
                  ? `Connected as ${accountName}`
                  : "Connect your LinkedIn account to automate actions"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-medium rounded-full px-2 py-0.5",
                phase === "done"
                  ? "bg-signal-green text-signal-green-text"
                  : "bg-signal-slate text-signal-slate-text",
              )}
            >
              {phase === "done" ? "Connected" : "Not connected"}
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

      {/* Connect LinkedIn form (phase: connect) */}
      {phase === "connect" && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Connect Your LinkedIn
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="LinkedIn email"
              className="w-full px-3 py-2 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="LinkedIn password"
                className="w-full px-3 py-2 pr-9 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-faint hover:text-ink-muted"
              >
                {showPassword ? (
                  <EyeOff size={13} strokeWidth={1.5} />
                ) : (
                  <Eye size={13} strokeWidth={1.5} />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleConnectLinkedIn}
              disabled={connectingLinkedIn}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {connectingLinkedIn ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Linkedin size={12} />
                  Connect LinkedIn
                </>
              )}
            </button>
            <p className="text-[10px] text-ink-faint">
              Your credentials are sent securely to Unipile and are not stored by Leadey.
            </p>
          </div>
        </div>
      )}

      {/* 2FA / Checkpoint form (phase: checkpoint) */}
      {phase === "checkpoint" && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Verify Your Identity
          </p>
          <p className="text-[11px] text-ink-secondary mb-3">
            LinkedIn requires verification. Either enter the code sent to you, or approve the sign-in on the LinkedIn app.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter verification code"
              className="w-full px-3 py-2 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResolveCheckpoint}
                disabled={resolvingCheckpoint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {resolvingCheckpoint ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Submit Code"
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipCheckpoint}
                disabled={loadingAccounts}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                {loadingAccounts ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I approved it on the app"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account selection (phase: select-account or done) */}
      {(phase === "select-account" || phase === "done") && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
              LinkedIn Accounts
            </p>
            <button
              type="button"
              onClick={() => setPhase("connect")}
              className="px-3 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors border border-border-subtle"
            >
              + Add Another
            </button>
          </div>

          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-[11px] text-ink-muted py-2">
              <Loader2 size={12} className="animate-spin" />
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div>
              <p className="text-[11px] text-ink-muted py-1 mb-2">
                No LinkedIn accounts found yet.
              </p>
              <button
                type="button"
                onClick={() => setPhase("connect")}
                className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors"
              >
                Connect LinkedIn
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={cn(
                    "flex items-center justify-between rounded-[8px] px-2 py-1.5 transition-colors",
                    selectedAccountId === account.id
                      ? "bg-signal-green/10 border border-signal-green-text/20"
                      : "hover:bg-hover",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink truncate">{account.name || account.id}</p>
                    <p className="text-[10px] text-ink-muted truncate">
                      {account.type}
                    </p>
                  </div>
                  {selectedAccountId === account.id ? (
                    <span className="text-[10px] font-medium text-signal-green-text flex items-center gap-1">
                      <Check size={11} />
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectAccount(account)}
                      disabled={savingAccount}
                      className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                    >
                      {savingAccount ? "..." : "Select"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
