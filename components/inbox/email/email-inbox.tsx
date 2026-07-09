"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Inbox as InboxIcon, Star, Clock, Send, Archive, PenLine, Search, X, Check,
  ArrowUpDown, ChevronDown, MailOpen, Plus, MailCheck, CheckCircle2,
  Loader2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queries/keys";
import {
  listEmailThreads, patchEmailThread, bulkEmailThreads,
  type EmailThreadSummary, type ThreadBulkAction, type ThreadPatch,
} from "@/lib/api/email-threads";
import { listSendingAccounts } from "@/lib/api/email";
import type { SendingAccount } from "@/lib/types/email";
import { globalSearch } from "@/lib/api/search";
import type { SearchResult } from "@/lib/types/search";
import { useLeadStatuses } from "@/lib/hooks/use-lead-statuses";
import { STATUS_COLOR_DOT } from "@/lib/utils/lead-status";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { EmailComposerDrawer } from "@/components/email/email-composer-drawer";
import { ThreadReader } from "./thread-reader";
import {
  FOLDER_DEFS, inFolder, threadTime, snoozePresets, STATUS_BADGE, type EmailFolder,
} from "./shared";

const FOLDER_ICONS: Record<EmailFolder, LucideIcon> = {
  inbox: InboxIcon, starred: Star, snoozed: Clock, sent: Send, archive: Archive,
};

type SortKey = "newest" | "oldest" | "unread" | "company";
const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first", oldest: "Oldest first", unread: "Unread first", company: "Company A–Z",
};

export function EmailInbox() {
  const router = useRouter();
  const qc = useQueryClient();
  const { statuses } = useLeadStatuses();

  const { data: threads = [], isPending } = useQuery({
    queryKey: qk.emailThreads,
    queryFn: listEmailThreads,
    refetchInterval: 30_000,
  });

  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  useEffect(() => {
    listSendingAccounts().then(setAccounts).catch(() => {});
  }, []);

  const [folder, setFolder] = useState<EmailFolder>("inbox");
  /** null = all mailboxes; otherwise the checked mailbox (account) ids. */
  const [mailboxSel, setMailboxSel] = useState<string[] | null>(null);
  const [statusKey, setStatusKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState({ unread: false, starred: false });
  const [sort, setSort] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [snoozeMenu, setSnoozeMenu] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composeLead, setComposeLead] = useState<{ id: string; name: string; email: string; company: string; title: string; funnelId: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(null), 2400);
  }
  useEffect(() => () => { if (toastT.current) clearTimeout(toastT.current); }, []);

  // ── optimistic cache patch + server write ─────────────────────────
  function patchLocal(leadIds: string[], patch: Partial<EmailThreadSummary>) {
    qc.setQueryData<EmailThreadSummary[]>(qk.emailThreads, (old) =>
      old?.map((t) => (leadIds.includes(t.leadId) ? { ...t, ...patch } : t)),
    );
  }

  async function doPatch(leadId: string, patch: ThreadPatch, msg?: string) {
    patchLocal([leadId], patch as Partial<EmailThreadSummary>);
    if (msg) showToast(msg);
    try {
      await patchEmailThread(leadId, patch);
    } catch {
      qc.invalidateQueries({ queryKey: qk.emailThreads });
    }
  }

  async function doBulk(action: ThreadBulkAction, snoozedUntil?: string) {
    const ids = selected;
    const local: Record<ThreadBulkAction, Partial<EmailThreadSummary>> = {
      read: { unread: false }, unread: { unread: true },
      archive: { archived: true }, unarchive: { archived: false },
      star: { starred: true }, unstar: { starred: false },
      snooze: { snoozedUntil: snoozedUntil ?? null }, unsnooze: { snoozedUntil: null },
    };
    patchLocal(ids, local[action]);
    setSelected([]);
    setSnoozeMenu(false);
    showToast(`${ids.length} conversation${ids.length === 1 ? "" : "s"} updated`);
    try {
      await bulkEmailThreads(ids, action, snoozedUntil);
    } catch {
      qc.invalidateQueries({ queryKey: qk.emailThreads });
    }
  }

  // ── derived ────────────────────────────────────────────────────────
  const statusByKey = useMemo(() => new Map(statuses.map((s) => [s.key, s])), [statuses]);

  const filtered = useMemo(() => {
    let list = threads.filter((t) =>
      statusKey ? t.status === statusKey && !t.archived : inFolder(t, folder),
    );
    if (mailboxSel) {
      const sel = new Set(mailboxSel);
      list = list.filter((t) => t.mailboxes.some((m) => sel.has(m.id)));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        `${t.leadName} ${t.leadEmail} ${t.company} ${t.subject} ${t.preview}`.toLowerCase().includes(q),
      );
    }
    if (quick.unread) list = list.filter((t) => t.unread);
    if (quick.starred) list = list.filter((t) => t.starred);
    const sorters: Record<SortKey, (a: EmailThreadSummary, b: EmailThreadSummary) => number> = {
      newest: (a, b) => b.lastAt.localeCompare(a.lastAt),
      oldest: (a, b) => a.lastAt.localeCompare(b.lastAt),
      unread: (a, b) => (a.unread === b.unread ? b.lastAt.localeCompare(a.lastAt) : a.unread ? -1 : 1),
      company: (a, b) => a.company.localeCompare(b.company),
    };
    return [...list].sort(sorters[sort]);
  }, [threads, folder, statusKey, mailboxSel, search, quick, sort]);

  // Every mailbox the caller can see: their own connected accounts plus any
  // mailbox appearing in the (permission-filtered) thread list. Reps without
  // org-wide inbox permission only ever receive their own here.
  const railMailboxes = useMemo(() => {
    const map = new Map<string, { id: string; email: string; active: boolean | null }>();
    for (const a of accounts) map.set(a.id, { id: a.id, email: a.email, active: a.isActive });
    for (const t of threads)
      for (const m of t.mailboxes)
        if (!map.has(m.id)) map.set(m.id, { id: m.id, email: m.email, active: null });
    return [...map.values()].sort((a, b) => a.email.localeCompare(b.email));
  }, [accounts, threads]);

  function toggleMailbox(id: string) {
    setMailboxSel((prev) => {
      if (prev === null) return [id]; // from "all" → just this one
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Nothing left, or everything checked again → back to "all".
      if (next.length === 0 || next.length === railMailboxes.length) return null;
      return next;
    });
  }

  const inboxUnread = useMemo(() => threads.filter((t) => inFolder(t, "inbox") && t.unread).length, [threads]);
  const folderCount = (f: EmailFolder) =>
    f === "inbox" ? inboxUnread : threads.filter((t) => inFolder(t, f)).length;

  const railStatuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of threads) if (!t.archived) counts.set(t.status, (counts.get(t.status) || 0) + 1);
    return statuses.filter((s) => (counts.get(s.key) || 0) > 0).map((s) => ({ ...s, count: counts.get(s.key) || 0 }));
  }, [threads, statuses]);

  const openSummary = openLeadId ? threads.find((t) => t.leadId === openLeadId) ?? null : null;

  function selectFolder(f: EmailFolder) {
    setFolder(f); setStatusKey(null); setOpenLeadId(null); setSelected([]);
  }

  function openThread(t: EmailThreadSummary) {
    setOpenLeadId(t.leadId);
    if (t.unread) patchLocal([t.leadId], { unread: false }); // server marks read on GET
  }

  const chipBase = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors";

  return (
    <div className="flex-1 min-h-0 flex bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
      {/* ═══ Left rail ═══ */}
      <div className="w-[210px] shrink-0 border-r border-border-subtle overflow-y-auto flex flex-col">
        <div className="p-3 pb-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-ink text-on-ink rounded-[20px] py-2.5 text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            <PenLine size={14} />
            Compose
          </button>
        </div>

        <div className="flex flex-col gap-px px-2">
          {FOLDER_DEFS.map((f) => {
            const Icon = FOLDER_ICONS[f.id];
            const active = folder === f.id && !statusKey;
            const n = folderCount(f.id);
            return (
              <button
                key={f.id}
                onClick={() => selectFolder(f.id)}
                className={cn(
                  "flex items-center justify-between rounded-[8px] px-2.5 py-2 text-[12.5px] transition-colors",
                  active ? "bg-hover text-ink font-semibold" : "text-ink-secondary hover:bg-hover/50",
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon size={15} className={active ? "text-ink" : "text-ink-muted"} />
                  {f.label}
                </span>
                {n > 0 && (
                  <span className={cn(
                    "text-[10.5px]",
                    f.id === "inbox" ? "font-semibold text-accent" : "text-ink-faint",
                  )}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {railStatuses.length > 0 && (
          <>
            <div className="px-4 pt-4 pb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Statuses</span>
            </div>
            <div className="flex flex-col gap-px px-2">
              {railStatuses.map((s) => {
                const active = statusKey === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setStatusKey(active ? null : s.key);
                      setOpenLeadId(null); setSelected([]);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-[12.5px] transition-colors",
                      active ? "bg-hover text-ink font-medium" : "text-ink-secondary hover:bg-hover/50",
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_COLOR_DOT[s.color])} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-[10.5px] text-ink-faint">{s.count}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="px-4 pt-4 pb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Mailboxes</span>
        </div>
        <div className="flex flex-col gap-px px-2 pb-3">
          {railMailboxes.length > 1 && (
            <button
              onClick={() => setMailboxSel(null)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[11.5px] transition-colors",
                mailboxSel === null ? "text-ink font-medium" : "text-ink-secondary hover:bg-hover/50",
              )}
            >
              <span className={cn(
                "w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors",
                mailboxSel === null ? "bg-ink border-ink" : "border-border-default",
              )}>
                {mailboxSel === null && <Check size={10} className="text-on-ink" />}
              </span>
              All mailboxes
            </button>
          )}
          {railMailboxes.map((m) => {
            const checked = mailboxSel === null || mailboxSel.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMailbox(m.id)}
                title={m.email}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] min-w-0 transition-colors",
                  checked ? "text-ink" : "text-ink-muted hover:bg-hover/50",
                )}
              >
                <span className={cn(
                  "w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors",
                  checked ? "bg-ink border-ink" : "border-border-default",
                )}>
                  {checked && <Check size={10} className="text-on-ink" />}
                </span>
                <span className={cn(
                  "w-[7px] h-[7px] rounded-full shrink-0",
                  m.active === null ? "bg-signal-slate-text" : m.active ? "bg-signal-green-text" : "bg-signal-red-text",
                )} />
                <span className="text-[11.5px] truncate">{m.email}</span>
              </button>
            );
          })}
          <button
            onClick={() => router.push("/dashboard/settings?tab=email-accounts")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[11.5px] text-ink-muted hover:bg-hover/50 hover:text-ink transition-colors"
          >
            <Plus size={13} />
            Connect mailbox
          </button>
        </div>
      </div>

      {/* ═══ List pane ═══ */}
      <div className="w-[350px] xl:w-[390px] shrink-0 border-r border-border-subtle flex flex-col min-h-0">
        <div className="p-3 pb-2.5 border-b border-border-subtle">
          <div className="flex items-center gap-2 bg-page border border-border-subtle rounded-[9px] px-2.5 py-2 focus-within:border-border-default transition-colors">
            <Search size={14} className="text-ink-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email…"
              className="bg-transparent outline-none text-[12.5px] text-ink placeholder:text-ink-faint w-full"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-ink-muted hover:text-ink">
                <X size={13} />
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setQuick((p) => ({ ...p, unread: !p.unread }))}
                  className={cn(chipBase, quick.unread
                    ? "bg-section border-border-default text-ink"
                    : "border-border-subtle text-ink-muted hover:text-ink-secondary")}
                >
                  Unread
                </button>
                <button
                  onClick={() => setQuick((p) => ({ ...p, starred: !p.starred }))}
                  className={cn(chipBase, quick.starred
                    ? "bg-section border-border-default text-ink"
                    : "border-border-subtle text-ink-muted hover:text-ink-secondary")}
                >
                  <Star size={11} />
                  Starred
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-[8px] px-2 py-1.5 text-[11px] text-ink-secondary hover:bg-hover transition-colors"
                  title={SORT_LABELS[sort]}
                >
                  <ArrowUpDown size={13} />
                  <ChevronDown size={12} />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-8 z-50 min-w-[150px] bg-surface border border-border-default rounded-[10px] shadow-lg p-1.5">
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => { setSort(k); setSortOpen(false); }}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 rounded-[7px] px-2.5 py-1.5 text-[12px]",
                            sort === k ? "bg-section text-ink" : "text-ink-secondary hover:bg-hover",
                          )}
                        >
                          {SORT_LABELS[k]}
                          {sort === k && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected([])}
                  className="w-7 h-7 flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink"
                >
                  <X size={14} />
                </button>
                <span className="text-[12px] font-semibold text-ink">{selected.length} selected</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => doBulk("read")} title="Mark read"
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                  <MailOpen size={14} />
                </button>
                <button onClick={() => doBulk(folder === "archive" ? "unarchive" : "archive")} title={folder === "archive" ? "Unarchive" : "Archive"}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                  <Archive size={14} />
                </button>
                <div className="relative">
                  <button onClick={() => setSnoozeMenu((v) => !v)} title="Snooze"
                    className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                    <Clock size={14} />
                  </button>
                  {snoozeMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSnoozeMenu(false)} />
                      <div className="absolute right-0 top-8 z-50 min-w-[140px] bg-surface border border-border-default rounded-[10px] shadow-lg p-1.5">
                        {snoozePresets().map((p) => (
                          <button
                            key={p.label}
                            onClick={() => doBulk("snooze", p.until.toISOString())}
                            className="w-full text-left rounded-[7px] px-2.5 py-1.5 text-[12px] text-ink-secondary hover:bg-hover"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => doBulk("star")} title="Star"
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                  <Star size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isPending ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin text-ink-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <span className="w-12 h-12 rounded-[13px] bg-section flex items-center justify-center mb-3.5">
                <MailCheck size={20} className="text-ink-muted" />
              </span>
              <div className="text-[13.5px] font-semibold text-ink">Nothing here</div>
              <p className="text-[12px] text-ink-muted mt-1 max-w-[220px]">
                No emails match this view. Try another folder or clear your filters.
              </p>
            </div>
          ) : (
            filtered.map((t) => {
              const sel = selected.includes(t.leadId);
              const open = openLeadId === t.leadId;
              const st = statusByKey.get(t.status);
              return (
                <div
                  key={t.leadId}
                  onClick={() => openThread(t)}
                  className={cn(
                    "group relative cursor-pointer border-b border-border-subtle transition-colors",
                    open ? "bg-accent/8" : "hover:bg-hover/40",
                  )}
                >
                  <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", open ? "bg-accent" : "bg-transparent")} />
                  <div className="flex items-start gap-2.5 py-3 pl-3.5 pr-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected((p) => (sel ? p.filter((x) => x !== t.leadId) : [...p, t.leadId]));
                      }}
                      className={cn(
                        "w-[18px] h-[18px] mt-2 rounded-[5px] border flex items-center justify-center shrink-0 transition-all",
                        sel
                          ? "opacity-100 bg-ink border-ink"
                          : "opacity-0 group-hover:opacity-100 border-border-default hover:border-ink",
                      )}
                    >
                      {sel && <Check size={11} className="text-on-ink" />}
                    </button>
                    <MemberAvatar id={t.leadId} name={t.leadName} size="md" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-[12.5px] truncate", t.unread ? "font-bold text-ink" : "font-normal text-ink")}>
                          {t.leadName}
                        </span>
                        <span className="text-[10.5px] text-ink-faint shrink-0">{threadTime(t.lastAt)}</span>
                      </div>
                      <div className={cn("text-[12px] truncate mt-0.5", t.unread ? "font-semibold text-ink-secondary" : "text-ink-secondary")}>
                        {t.subject || "(no subject)"}
                      </div>
                      <div className="text-[11.5px] text-ink-muted truncate mt-0.5">{t.preview}</div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {st && (
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5", STATUS_BADGE[st.color])}>
                            <span className="w-[5px] h-[5px] rounded-full bg-current" />
                            {st.label}
                          </span>
                        )}
                        {t.funnelName && (
                          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-signal-slate text-signal-slate-text truncate max-w-[150px]">
                            {t.funnelName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); doPatch(t.leadId, { starred: !t.starred }); }}
                        className="transition-colors"
                        title={t.starred ? "Unstar" : "Star"}
                      >
                        <Star size={14} className={t.starred ? "text-amber-500 fill-amber-500" : "text-ink-faint hover:text-ink-muted"} />
                      </button>
                      {t.unread && <span className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ Reading pane ═══ */}
      <ThreadReader
        key={openLeadId || "none"}
        leadId={openLeadId}
        summary={openSummary}
        statuses={statuses}
        onPatch={doPatch}
        onClose={() => setOpenLeadId(null)}
        showToast={showToast}
      />

      {/* Compose: pick a lead, then the full composer drawer */}
      {pickerOpen && (
        <ComposeLeadPicker
          onClose={() => setPickerOpen(false)}
          onPick={(lead) => { setPickerOpen(false); setComposeLead(lead); }}
        />
      )}
      {composeLead && (
        <EmailComposerDrawer
          open
          onClose={() => setComposeLead(null)}
          lead={composeLead}
          funnelId={composeLead.funnelId}
          onSent={() => {
            setComposeLead(null);
            showToast("Email sent");
            qc.invalidateQueries({ queryKey: qk.emailThreads });
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2.5 bg-surface border border-border-default rounded-full px-5 py-2.5 shadow-xl">
          <CheckCircle2 size={15} className="text-signal-green-text" />
          <span className="text-[12.5px] font-medium text-ink">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ── Compose lead picker ───────────────────────────────────────────────
// The send endpoint is lead-scoped, so composing starts by choosing who
// the email goes to; the full composer drawer opens for that lead.
function ComposeLeadPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (lead: { id: string; name: string; email: string; company: string; title: string; funnelId: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults([]); return; }
    const ctl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      globalSearch(query, ctl.signal)
        .then((r) => setResults(r.results.filter((x) => x.type === "lead").slice(0, 8)))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  async function pick(r: SearchResult) {
    setResolving(r.id);
    setError(null);
    try {
      const { getEmailThread } = await import("@/lib/api/email-threads");
      const detail = await getEmailThread(r.id);
      if (!detail.lead.email) {
        setError(`${detail.lead.name} has no email address on file.`);
        setResolving(null);
        return;
      }
      onPick({
        id: detail.lead.id,
        name: detail.lead.name,
        email: detail.lead.email,
        company: detail.lead.company,
        title: detail.lead.title,
        funnelId: detail.lead.funnelId,
      });
    } catch {
      setError("Couldn't load that lead — try again.");
      setResolving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[18vh] px-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] bg-surface border border-border-default rounded-[14px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border-subtle">
          <Search size={15} className="text-ink-muted shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads to email…"
            className="bg-transparent outline-none text-[13px] text-ink placeholder:text-ink-faint w-full"
          />
          {searching && <Loader2 size={14} className="animate-spin text-ink-muted" />}
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {error && <p className="text-[11.5px] text-signal-red-text px-2.5 py-2">{error}</p>}
          {results.length === 0 && !error && (
            <p className="text-[12px] text-ink-muted px-2.5 py-3 text-center">
              {q.trim().length < 2 ? "Type a name, company or email address." : searching ? "Searching…" : "No leads found."}
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => pick(r)}
              disabled={!!resolving}
              className="w-full flex items-center gap-3 rounded-[10px] px-2.5 py-2 hover:bg-hover text-left transition-colors disabled:opacity-60"
            >
              <MemberAvatar id={r.id} name={r.title} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-ink truncate">{r.title}</span>
                <span className="block text-[11px] text-ink-muted truncate">{r.subtitle}</span>
              </span>
              {resolving === r.id && <Loader2 size={14} className="animate-spin text-ink-muted shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
