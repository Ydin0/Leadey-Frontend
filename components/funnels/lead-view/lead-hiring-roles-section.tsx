"use client";

import { useEffect, useState, useCallback } from "react";
import { Briefcase, Plus, X, Pencil, MapPin, Banknote, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getHiringRoles,
  createHiringRole,
  updateHiringRole,
  deleteHiringRole,
  type HiringRole,
} from "@/lib/api/hiring-roles";
import { Section, MiniBtn } from "./lead-section";

type Draft = {
  title: string;
  seniority: string;
  salaryRange: string;
  location: string;
  postedAgo: string;
  description: string;
  url: string;
};

const EMPTY: Draft = {
  title: "",
  seniority: "",
  salaryRange: "",
  location: "",
  postedAgo: "",
  description: "",
  url: "",
};

const inputClass =
  "w-full bg-surface border border-border-subtle rounded-md px-2 py-1.5 text-[11.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default";

export function LeadHiringRolesSection({ funnelId, leadId }: { funnelId: string; leadId: string }) {
  const isAuthReady = useAuthReady();
  const [roles, setRoles] = useState<HiringRole[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoles(await getHiringRoles(funnelId, leadId));
    } catch (err) {
      console.error("Failed to load hiring roles:", err);
    }
  }, [funnelId, leadId]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  function startAdd() {
    setDraft(EMPTY);
    setEditing("new");
  }

  function startEdit(r: HiringRole) {
    setDraft({
      title: r.title,
      seniority: r.seniority,
      salaryRange: r.salaryRange,
      location: r.location,
      postedAgo: r.postedAgo,
      description: r.description,
      url: r.url,
    });
    setEditing(r.id);
  }

  async function save() {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      if (editing === "new") {
        const created = await createHiringRole(funnelId, leadId, draft);
        setRoles((p) => [created, ...p]);
      } else if (editing) {
        const updated = await updateHiringRole(editing, draft);
        setRoles((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      }
      setEditing(null);
      setDraft(EMPTY);
    } catch (err) {
      console.error("Failed to save hiring role:", err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setRoles((p) => p.filter((r) => r.id !== id));
    if (editing === id) setEditing(null);
    try {
      await deleteHiringRole(id);
    } catch {
      void load();
    }
  }

  const form = (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-border-subtle bg-section/40">
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Role title (e.g. Senior Backend Engineer)"
        className={inputClass}
      />
      <div className="flex gap-1.5">
        <input
          value={draft.seniority}
          onChange={(e) => setDraft({ ...draft, seniority: e.target.value })}
          placeholder="Seniority"
          className={inputClass}
        />
        <input
          value={draft.postedAgo}
          onChange={(e) => setDraft({ ...draft, postedAgo: e.target.value })}
          placeholder="Posted (e.g. 3 days ago)"
          className={inputClass}
        />
      </div>
      <div className="flex gap-1.5">
        <input
          value={draft.salaryRange}
          onChange={(e) => setDraft({ ...draft, salaryRange: e.target.value })}
          placeholder="Salary range"
          className={inputClass}
        />
        <input
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          placeholder="Location"
          className={inputClass}
        />
      </div>
      <input
        value={draft.url}
        onChange={(e) => setDraft({ ...draft, url: e.target.value })}
        placeholder="Listing URL (optional)"
        className={inputClass}
      />
      <textarea
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        rows={2}
        placeholder="Short description (optional)"
        className={cn(inputClass, "resize-none")}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setEditing(null);
            setDraft(EMPTY);
          }}
          className="px-2.5 py-1 rounded-full text-[11px] text-ink-muted hover:bg-hover"
        >
          Cancel
        </button>
        <button
          onClick={() => void save()}
          disabled={saving || !draft.title.trim()}
          className="px-3 py-1 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50"
        >
          {editing === "new" ? "Add role" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <Section
      icon={Briefcase}
      title="Hiring roles"
      count={roles.length}
      actions={<MiniBtn icon={Plus} title="Add role" onClick={startAdd} />}
    >
      <div className="flex flex-col gap-1.5">
        {roles.map((r) =>
          editing === r.id ? (
            <div key={r.id}>{form}</div>
          ) : (
            <div
              key={r.id}
              className="group rounded-lg border border-border-subtle bg-section/40 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-ink">{r.title}</span>
                    {r.seniority && (
                      <span className="text-[9.5px] rounded-full px-1.5 py-0.5 bg-signal-slate text-signal-slate-text">
                        {r.seniority}
                      </span>
                    )}
                  </div>
                  {(r.salaryRange || r.location || r.postedAgo) && (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10.5px] text-ink-faint">
                      {r.salaryRange && (
                        <span className="flex items-center gap-1">
                          <Banknote size={10} />
                          {r.salaryRange}
                        </span>
                      )}
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {r.location}
                        </span>
                      )}
                      {r.postedAgo && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {r.postedAgo}
                        </span>
                      )}
                    </div>
                  )}
                  {r.description && (
                    <p className="text-[11px] text-ink-muted mt-1 leading-snug">{r.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {r.url && (
                    <a
                      href={r.url.startsWith("http") ? r.url : `https://${r.url}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open listing"
                      className="text-ink-faint hover:text-accent transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => startEdit(r)}
                    title="Edit role"
                    className="text-ink-faint hover:text-ink transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => void remove(r.id)}
                    title="Delete role"
                    className="text-ink-faint hover:text-signal-red-text transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          ),
        )}

        {editing === "new" && form}

        {roles.length === 0 && editing !== "new" && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 py-1.5 px-1 text-[11.5px] text-ink-muted hover:text-ink-secondary transition-colors"
          >
            <Plus size={12} />
            Add a hiring role…
          </button>
        )}
      </div>
    </Section>
  );
}
