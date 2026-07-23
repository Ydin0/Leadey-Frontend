"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Linkedin, ArrowUpRight, ChevronDown, ChevronRight, UserPlus, Check, Clock } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  getLinkedInThreads, getLinkedInInvitations, syncLinkedIn,
  type LinkedInThread, type LinkedInInvitation,
} from "@/lib/api/linkedin";
import { LinkedInThreadDrawer } from "@/components/linkedin/linkedin-thread-drawer";

/** LinkedIn tab — conversation threads (incoming/outgoing messages) plus a
 *  "Sent connection requests" section that expands to the full list with
 *  pending/accepted status. Mirrors the SMS Messages tab. */
export function LinkedInInbox() {
  const router = useRouter();
  const [threads, setThreads] = useState<LinkedInThread[]>([]);
  const [invitations, setInvitations] = useState<LinkedInInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [active, setActive] = useState<LinkedInThread | null>(null);

  const refresh = useCallback(() => {
    return Promise.all([getLinkedInThreads(), getLinkedInInvitations()])
      .then(([t, i]) => { setThreads(t); setInvitations(i); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Pull the latest conversations from Unipile, then load.
    syncLinkedIn()
      .catch(() => {})
      .then(() => Promise.all([getLinkedInThreads(), getLinkedInInvitations()]))
      .then(([t, i]) => { if (!cancelled) { setThreads(t); setInvitations(i); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const unreadCount = threads.filter((t) => t.needsReply).length;
  const shown = filter === "unread" ? threads.filter((t) => t.needsReply) : threads;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;

  return (
    <div className="flex-1 flex flex-col rounded-[14px] border border-border-subtle bg-surface overflow-hidden min-h-0">
      {/* Sent connection requests — collapsible */}
      <button
        onClick={() => setInvitesOpen((o) => !o)}
        className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors shrink-0"
      >
        <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
          <UserPlus size={13} className="text-signal-blue-text" />
          Sent connection requests
          <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-section text-ink-muted">{invitations.length}</span>
          {pendingInvites > 0 && (
            <span className="text-[10px] font-medium text-ink-muted">· {pendingInvites} pending</span>
          )}
        </span>
        {invitesOpen ? <ChevronDown size={15} className="text-ink-muted" /> : <ChevronRight size={15} className="text-ink-muted" />}
      </button>
      {invitesOpen && (
        <div className="max-h-56 overflow-y-auto border-b border-border-subtle bg-page/30 shrink-0">
          {invitations.length === 0 ? (
            <p className="text-[11px] text-ink-muted px-3 py-3">No connection requests sent yet.</p>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2 border-b border-border-subtle/60 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-ink truncate">{inv.name}</div>
                  <div className="text-[10.5px] text-ink-muted truncate">{inv.company || "—"} · sent {formatRelativeTime(new Date(inv.sentAt))}</div>
                </div>
                <InvitationPill status={inv.status} />
                {inv.leadId && inv.funnelId && (
                  <button
                    onClick={() => router.push(`/dashboard/funnels/${inv.funnelId}/leads/${inv.leadId}`)}
                    title="Open lead"
                    className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-hover"
                  >
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* All / Unread filter */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle shrink-0">
        {([
          { key: "all" as const, label: "All", n: threads.length },
          { key: "unread" as const, label: "Unread", n: unreadCount },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
              filter === f.key ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink-secondary hover:bg-hover",
            )}
          >
            {f.label}
            {f.n > 0 && (
              <span className={cn(
                "text-[9px] font-semibold rounded-full px-1.5 min-w-[15px] text-center",
                filter === f.key ? "bg-on-ink/20 text-on-ink" : "bg-section text-ink-muted",
              )}>{f.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
            <Linkedin size={20} className="text-ink-faint" />
            <p className="text-[12px] text-ink-muted">
              {filter === "unread" ? "No unread LinkedIn messages." : "No LinkedIn conversations yet."}
            </p>
          </div>
        ) : (
          shown.map((t) => (
            <div
              key={t.key}
              onClick={() => setActive(t)}
              className="group relative flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle hover:bg-hover/40 transition-colors cursor-pointer"
            >
              <span className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                t.needsReply ? "bg-signal-blue/15 text-signal-blue-text" : "bg-section text-ink-muted")}>
                <Linkedin size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12.5px] font-medium text-ink truncate">{t.contactName}</span>
                  {t.company && <span className="text-[10.5px] text-ink-muted shrink-0 truncate max-w-[140px]">{t.company}</span>}
                  {t.needsReply && (
                    <span className="text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-signal-blue/15 text-signal-blue-text shrink-0">Reply</span>
                  )}
                </div>
                <div className="text-[10.5px] text-ink-muted truncate">
                  {t.lastDirection === "inbound" ? "" : "You: "}{t.lastBody || "—"}
                </div>
              </div>
              <span className="text-[10.5px] text-ink-faint shrink-0 w-16 text-right">{formatRelativeTime(new Date(t.lastAt))}</span>
              {t.leadId && t.funnelId && (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/funnels/${t.funnelId}/leads/${t.leadId}`); }}
                  title="Open lead"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity bg-surface"
                >
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <LinkedInThreadDrawer
        open={!!active}
        onClose={() => setActive(null)}
        providerId={active?.providerId ?? null}
        leadId={active?.leadId ?? null}
        funnelId={active?.funnelId ?? null}
        contactName={active?.contactName || "LinkedIn member"}
        onSent={refresh}
      />
    </div>
  );
}

function InvitationPill({ status }: { status: LinkedInInvitation["status"] }) {
  if (status === "accepted") {
    return <span className="inline-flex items-center gap-1 text-[9px] font-medium rounded-full px-2 py-0.5 bg-signal-green/15 text-signal-green-text shrink-0"><Check size={9} strokeWidth={2.5} /> Accepted</span>;
  }
  if (status === "pending") {
    return <span className="inline-flex items-center gap-1 text-[9px] font-medium rounded-full px-2 py-0.5 bg-signal-amber/15 text-signal-amber-text shrink-0"><Clock size={9} /> Pending</span>;
  }
  return <span className="inline-flex items-center text-[9px] font-medium rounded-full px-2 py-0.5 bg-section text-ink-muted shrink-0">{status}</span>;
}
