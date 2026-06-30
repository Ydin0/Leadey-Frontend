"use client";

import { useState } from "react";
import { X, Loader2, Building2 } from "lucide-react";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

/** Create a brand-new workspace (Clerk organization) from inside the app. On
 *  success the new org becomes active and the user lands on its settings to
 *  finish setup (logo, country, billing email). */
export function CreateWorkspaceModal({ onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspaces();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 1;

  async function create() {
    if (!valid || creating) return;
    setCreating(true);
    setError(null);
    try {
      await createWorkspace(name.trim());
      // createWorkspace hard-navigates on success; nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the workspace. Try again.");
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 px-4" onClick={onClose}>
      <div className="relative bg-surface rounded-[14px] border border-border-subtle shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-section">
              <Building2 size={14} className="text-ink-secondary" />
            </span>
            <h2 className="text-[14px] font-semibold text-ink">Create a workspace</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-hover transition-colors">
            <X size={16} strokeWidth={1.5} className="text-ink-muted" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Workspace name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
            placeholder="e.g. Acme Inc"
            className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
          <p className="text-[11px] text-ink-muted mt-2.5">
            You&apos;ll be the admin. After creating it you can add a logo, country and billing details.
          </p>
          {error && <p className="text-[11.5px] text-signal-red-text mt-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button onClick={onClose} disabled={creating} className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={() => void create()} disabled={!valid || creating} className="flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Building2 size={12} />}
            Create workspace
          </button>
        </div>
      </div>
    </div>
  );
}
