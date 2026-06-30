"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { Modal, ModalHeader } from "@/components/email/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiKeys, createApiKey, revokeApiKey } from "@/lib/api/api-keys";
import type { ApiKey } from "@/lib/types/api-keys";

function SettingCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ApiKeysSection() {
  const isAuthReady = useAuthReady();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create flow
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke flow
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const data = await getApiKeys();
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void loadKeys();
  }, [isAuthReady, loadKeys]);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setKeyName("");
    setRevealedSecret(null);
    setCreateError(null);
    setCopied(false);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setRevealedSecret(null);
  }

  async function handleCreate() {
    if (!keyName.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { key, secret } = await createApiKey(keyName.trim());
      setRevealedSecret(secret);
      setKeys((prev) => [key, ...prev]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  function copySecret() {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    if (!confirmRevoke || revoking) return;
    setRevoking(true);
    try {
      await revokeApiKey(confirmRevoke.id);
      setKeys((prev) => prev.filter((k) => k.id !== confirmRevoke.id));
      showToast("success", "API key revoked");
      setConfirmRevoke(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingCard
        title="API Keys"
        description="Create and manage keys for the Leadey API. Use a key as a Bearer token to authenticate requests to the public API."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors shrink-0"
          >
            <Plus size={13} strokeWidth={2} />
            Create key
          </button>
        }
      >
        {toast && (
          <div
            className={cn(
              "mb-4 flex items-center gap-2 px-3 py-2 rounded-[10px] text-[11px] border",
              toast.type === "success"
                ? "bg-signal-green/10 border-signal-green-text/20 text-signal-green-text"
                : "bg-signal-red/10 border-signal-red-text/20 text-signal-red-text",
            )}
          >
            {toast.type === "success" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span className="flex-1">{toast.text}</span>
            <button onClick={() => setToast(null)}>
              <X size={12} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-[10px] text-[11px] bg-signal-red/10 border border-signal-red-text/20 text-signal-red-text">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border-default bg-section/30 px-4 py-8 text-center">
            <Key size={20} className="text-ink-faint mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[12px] text-ink-muted">No API keys yet.</p>
            <p className="text-[11px] text-ink-faint mt-0.5">
              Create your first key to start using the Leadey API.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: "26%" }}>Name</TableHead>
                <TableHead style={{ width: "38%" }}>Key</TableHead>
                <TableHead style={{ width: "16%" }}>Last used</TableHead>
                <TableHead style={{ width: "12%" }}>Created</TableHead>
                <TableHead style={{ width: "8%" }} className="text-right">
                  &nbsp;
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-ink">{key.name}</TableCell>
                  <TableCell className="font-mono text-[11px] text-ink-secondary">
                    {key.maskedKey}
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {formatRelativeTime(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(key)}
                      title="Revoke key"
                      className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingCard>

      {/* Create key modal */}
      {showCreate && (
        <Modal onClose={revealedSecret ? () => {} : closeCreate} maxWidth={480}>
          <ModalHeader
            title={revealedSecret ? "Save your API key" : "Create API key"}
            onClose={revealedSecret ? closeCreate : () => setShowCreate(false)}
          />
          <div className="p-[18px]">
            {!revealedSecret ? (
              <>
                <p className="text-[11.5px] text-ink-muted mb-4">
                  Give your key a name to identify it later. The secret is shown once on the next
                  screen.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Production integration"
                  maxLength={80}
                  className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint outline-none focus:border-signal-blue-text/30 mb-4"
                />
                {createError && (
                  <p className="text-[11.5px] text-signal-red-text mb-3">{createError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!keyName.trim() || creating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-[10px] bg-signal-blue/10 border border-signal-blue-text/20 text-signal-blue-text text-[11px]">
                  <AlertTriangle size={13} className="mt-px shrink-0" />
                  <span>
                    Copy this key now — for your security, it won&apos;t be shown again.
                  </span>
                </div>
                <div className="bg-section/50 rounded-[10px] border border-border-subtle p-3 mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
                    Secret key
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-[8px] bg-section text-[11px] text-ink-secondary font-mono break-all">
                      {revealedSecret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      title="Copy"
                      className="p-2 rounded-lg hover:bg-hover transition-colors shrink-0"
                    >
                      {copied ? (
                        <Check size={14} className="text-signal-green-text" />
                      ) : (
                        <Copy size={14} className="text-ink-muted" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Revoke confirmation modal */}
      {confirmRevoke && (
        <Modal onClose={() => !revoking && setConfirmRevoke(null)} maxWidth={440}>
          <ModalHeader
            title="Revoke API key?"
            onClose={() => !revoking && setConfirmRevoke(null)}
          />
          <div className="p-[18px]">
            <p className="text-[12.5px] text-ink-secondary">
              Revoking <span className="font-medium text-ink">{confirmRevoke.name}</span> immediately
              stops every request using it. This can&apos;t be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                disabled={revoking}
                className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-signal-red text-signal-red-text text-[11px] font-medium hover:bg-signal-red/80 transition-colors disabled:opacity-50"
              >
                {revoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Revoke
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
