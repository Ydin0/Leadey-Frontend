"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, Tags, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queries/keys";
import { useCampaignTagsQuery } from "@/lib/queries/use-org-config";
import { createCampaignTag, deleteCampaignTag, updateCampaignTag } from "@/lib/api/campaign-tags";
import { TAG_COLOR_META, TAG_COLOR_ORDER, TagPill } from "@/components/shared/campaign-tag";
import type { CampaignTagColor, CampaignTagWithCount } from "@/lib/types/funnel";

/** Swatch button + popover of the 8 named tag colors. */
function ColorPicker({ value, onChange }: { value: CampaignTagColor; onChange: (c: CampaignTagColor) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-1.5 py-1.5 rounded-[8px] border border-border-subtle bg-section hover:border-border-default transition-colors"
        title="Tag color"
      >
        <span className={cn("w-3.5 h-3.5 rounded-full", TAG_COLOR_META[value].dot)} />
        <ChevronDown size={11} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 grid grid-cols-4 gap-1.5 bg-surface rounded-[10px] border border-border-subtle shadow-lg p-2">
          {TAG_COLOR_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              title={c}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                c === value && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
              )}
            >
              <span className={cn("w-4 h-4 rounded-full", TAG_COLOR_META[c].dot)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagRow({ tag, onChanged }: { tag: CampaignTagWithCount; onChanged: () => void }) {
  const [name, setName] = useState(tag.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(patch: { name?: string; color?: CampaignTagColor }) {
    setBusy(true);
    setError(null);
    try {
      await updateCampaignTag(tag.id, patch);
      onChanged();
    } catch (err: any) {
      setError(err?.message || "Could not update tag");
      setName(tag.name); // revert a failed rename
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      tag.campaignCount > 0 &&
      !window.confirm(`"${tag.name}" is on ${tag.campaignCount} campaign${tag.campaignCount === 1 ? "" : "s"} — remove it everywhere?`)
    )
      return;
    setBusy(true);
    try {
      await deleteCampaignTag(tag.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-border-subtle bg-section/40">
      <ColorPicker value={tag.color} onChange={(c) => void commit({ color: c })} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const next = name.trim();
          if (next && next !== tag.name) void commit({ name: next });
          else setName(tag.name);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        disabled={busy}
        className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink outline-none disabled:opacity-60"
      />
      {error && <span className="text-[10px] text-signal-red-text shrink-0">{error}</span>}
      <TagPill tag={{ id: tag.id, name: name.trim() || tag.name, color: tag.color }} />
      <span className="text-[10.5px] text-ink-faint w-20 text-right shrink-0">
        {tag.campaignCount} campaign{tag.campaignCount === 1 ? "" : "s"}
      </span>
      {busy ? (
        <Loader2 size={13} className="animate-spin text-ink-muted shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => void remove()}
          title="Delete tag"
          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-signal-red-text transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export function CampaignTagsSection() {
  const qc = useQueryClient();
  const { data: tags, isPending } = useCampaignTagsQuery();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<CampaignTagColor>("blue");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function reload() {
    void qc.invalidateQueries({ queryKey: qk.campaignTags });
    // Renames/recolors/deletes change the tag objects embedded on funnels.
    void qc.invalidateQueries({ queryKey: qk.funnels });
  }

  async function add() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await createCampaignTag({ name, color: newColor });
      setNewName("");
      reload();
    } catch (err: any) {
      setAddError(err?.message || "Could not create tag");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4 flex items-start gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-section shrink-0">
          <Tags size={15} className="text-ink-muted" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Campaign Tags</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Colored labels your team uses to organise and filter campaigns. Renaming or recoloring
            a tag updates it on every campaign.
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-[12px] text-ink-muted py-4">
          <Loader2 size={14} className="animate-spin" /> Loading tags…
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(tags ?? []).map((t) => (
            <TagRow key={t.id} tag={t} onChanged={reload} />
          ))}
          {(tags ?? []).length === 0 && (
            <p className="text-[12px] text-ink-muted px-1 py-2">
              No tags yet. Create your first below — e.g. “Outbound”, “Q3 Push”, “Enterprise”.
            </p>
          )}

          {/* Add row */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-dashed border-border-default mt-1">
            <ColorPicker value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
              placeholder="New tag name…"
              className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
            />
            {addError && <span className="text-[10px] text-signal-red-text shrink-0">{addError}</span>}
            <button
              type="button"
              onClick={() => void add()}
              disabled={!newName.trim() || adding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-on-ink text-[11px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            >
              {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2} />}
              Add tag
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
