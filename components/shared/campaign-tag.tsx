"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Settings2, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queries/keys";
import { useCampaignTagsQuery } from "@/lib/queries/use-org-config";
import { patchFunnel } from "@/lib/queries/funnel-cache";
import { createCampaignTag, setFunnelTags } from "@/lib/api/campaign-tags";
import type { CampaignTag, CampaignTagColor, CampaignTagWithCount } from "@/lib/types/funnel";

/** Theme-aware classes per named tag color. Every entry uses the signal
 *  token pairs so tags read correctly in both light and dark mode. */
export const TAG_COLOR_META: Record<CampaignTagColor, { pill: string; dot: string }> = {
  blue: { pill: "bg-signal-blue text-signal-blue-text", dot: "bg-signal-blue-text" },
  green: { pill: "bg-signal-green text-signal-green-text", dot: "bg-signal-green-text" },
  red: { pill: "bg-signal-red text-signal-red-text", dot: "bg-signal-red-text" },
  slate: { pill: "bg-signal-slate text-signal-slate-text", dot: "bg-signal-slate-text" },
  amber: { pill: "bg-signal-amber text-signal-amber-text", dot: "bg-signal-amber-text" },
  violet: { pill: "bg-signal-violet text-signal-violet-text", dot: "bg-signal-violet-text" },
  pink: { pill: "bg-signal-pink text-signal-pink-text", dot: "bg-signal-pink-text" },
  cyan: { pill: "bg-signal-cyan text-signal-cyan-text", dot: "bg-signal-cyan-text" },
};

export const TAG_COLOR_ORDER: CampaignTagColor[] = [
  "blue",
  "violet",
  "green",
  "amber",
  "pink",
  "cyan",
  "red",
  "slate",
];

export function TagPill({ tag, className }: { tag: CampaignTag; className?: string }) {
  const meta = TAG_COLOR_META[tag.color] ?? TAG_COLOR_META.blue;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap",
        meta.pill,
        className,
      )}
    >
      <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", meta.dot)} />
      {tag.name}
    </span>
  );
}

/** Row of tag pills capped at `max`, with a "+N" overflow pill. */
export function TagPillsRow({ tags, max = 3, className }: { tags: CampaignTag[]; max?: number; className?: string }) {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  const overflow = tags.length - shown.length;
  return (
    <div className={cn("flex items-center gap-1 flex-wrap min-w-0", className)}>
      {shown.map((t) => (
        <TagPill key={t.id} tag={t} />
      ))}
      {overflow > 0 && (
        <span
          className="text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-section text-ink-muted"
          title={tags.slice(max).map((t) => t.name).join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Pick the least-used palette color for a quick-created tag so a set of
 *  quick creations naturally spreads across the palette. */
function nextColor(existing: { color: CampaignTagColor }[]): CampaignTagColor {
  const counts = new Map<CampaignTagColor, number>(TAG_COLOR_ORDER.map((c) => [c, 0]));
  for (const t of existing) counts.set(t.color, (counts.get(t.color) ?? 0) + 1);
  return [...TAG_COLOR_ORDER].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0];
}

/**
 * Per-campaign tag picker — a small trigger that opens a fixed-position
 * popover (survives overflow-hidden list containers) listing the org's tags
 * with checkboxes, a quick-create row, and a "Manage tags" link. Persists on
 * every toggle and patches the funnels cache so pills update instantly.
 */
export function TagAssignMenu({
  funnelId,
  tags,
  className,
}: {
  funnelId: string;
  tags: CampaignTag[];
  className?: string;
}) {
  const qc = useQueryClient();
  const { data: allTags } = useCampaignTagsQuery();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Fixed positioning drifts under scroll — just close.
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const width = 264;
      const left = Math.min(r.left, window.innerWidth - width - 12);
      setPos({ top: r.bottom + 6, left: Math.max(12, left) });
    }
    setOpen((o) => !o);
  }

  async function persist(nextIds: string[], optimistic: CampaignTag[]) {
    patchFunnel(qc, funnelId, { tags: optimistic });
    try {
      const confirmed = await setFunnelTags(funnelId, nextIds);
      patchFunnel(qc, funnelId, { tags: confirmed });
      void qc.invalidateQueries({ queryKey: qk.campaignTags });
    } catch {
      // Re-sync from the server — the optimistic patch may be wrong.
      void qc.invalidateQueries({ queryKey: qk.funnels });
      void qc.invalidateQueries({ queryKey: qk.campaignTags });
    }
  }

  function toggleTag(tag: CampaignTagWithCount) {
    const has = selected.has(tag.id);
    const nextIds = has ? tags.filter((t) => t.id !== tag.id).map((t) => t.id) : [...tags.map((t) => t.id), tag.id];
    const optimistic = has
      ? tags.filter((t) => t.id !== tag.id)
      : [...tags, { id: tag.id, name: tag.name, color: tag.color }];
    void persist(nextIds, optimistic);
  }

  async function quickCreate() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await createCampaignTag({ name, color: nextColor(allTags ?? []) });
      setNewName("");
      void qc.invalidateQueries({ queryKey: qk.campaignTags });
      // Immediately attach the new tag to this campaign.
      await persist(
        [...tags.map((t) => t.id), created.id],
        [...tags, { id: created.id, name: created.name, color: created.color }],
      );
    } catch {
      /* duplicate name or network — leave the input for a retry */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        title="Edit tags"
        className={cn(
          "inline-flex items-center justify-center w-7 h-7 rounded-full text-ink-muted hover:text-ink hover:bg-hover transition-colors",
          className,
        )}
      >
        <Tags size={14} strokeWidth={1.5} />
      </button>

      {/* Portal: keeps the menu out of any parent <Link> (no nested anchors)
          and out of overflow-hidden list containers. */}
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[70] w-[264px] bg-surface rounded-[12px] border border-border-subtle shadow-lg overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-3 pt-2.5 pb-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            Campaign tags
          </div>
          <div className="max-h-[260px] overflow-y-auto pb-1">
            {(allTags ?? []).length === 0 && (
              <p className="px-3 py-2 text-[11px] text-ink-muted">
                No tags yet — create your first one below.
              </p>
            )}
            {(allTags ?? []).map((t) => {
              const meta = TAG_COLOR_META[t.color] ?? TAG_COLOR_META.blue;
              const checked = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-hover transition-colors text-left"
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors",
                      checked ? "bg-signal-blue-text border-signal-blue-text" : "border-border-default bg-section",
                    )}
                  >
                    {checked && <Check size={11} className="text-on-ink" strokeWidth={3} />}
                  </span>
                  <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                  <span className="text-[12px] text-ink truncate flex-1">{t.name}</span>
                  <span className="text-[10.5px] text-ink-faint shrink-0">{t.campaignCount}</span>
                </button>
              );
            })}
          </div>

          {/* Quick create */}
          <div className="p-2 border-t border-border-subtle">
            <div className="flex items-center gap-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void quickCreate();
                }}
                placeholder="Create a tag…"
                className="flex-1 min-w-0 bg-section rounded-[8px] px-2.5 py-1.5 text-[11.5px] text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="button"
                onClick={() => void quickCreate()}
                disabled={!newName.trim() || busy}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink text-on-ink disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                title="Create tag"
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>
            <Link
              href="/dashboard/settings?tab=campaign-tags"
              className="mt-1.5 flex items-center gap-1.5 px-1 py-1 text-[11px] text-ink-muted hover:text-ink-secondary transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings2 size={11} />
              Manage tags
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
