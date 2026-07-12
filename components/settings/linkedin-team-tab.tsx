"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Linkedin, Trash2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getTeamMembers } from "@/lib/api/team";
import {
  listLinkedInAccounts, connectLinkedIn, disconnectLinkedInAccount, type LinkedInAccount,
} from "@/lib/api/linkedin";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { TeamMember } from "@/lib/types/team";

function memberName(m: TeamMember): string {
  if (m.firstName || m.lastName) return `${m.firstName || ""} ${m.lastName || ""}`.trim();
  return m.email;
}

/** One usage row (e.g. "Invites 12 / 80"). */
function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const hot = pct >= 90;
  return (
    <div className="min-w-[92px]">
      <div className="flex items-center justify-between text-[9.5px] text-ink-muted mb-0.5">
        <span>{label}</span>
        <span className={hot ? "text-signal-red-text font-medium" : ""}>{used}/{limit}</span>
      </div>
      <div className="h-1 rounded-full bg-section overflow-hidden">
        <div className={`h-full rounded-full ${hot ? "bg-signal-red" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LinkedInTeamTab() {
  const isAuthReady = useAuthReady();
  const params = useSearchParams();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [team, accts] = await Promise.all([
      getTeamMembers().then((d) => d.members).catch(() => []),
      listLinkedInAccounts().catch(() => []),
    ]);
    setMembers(team);
    setAccounts(accts);
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void load().finally(() => setLoading(false));
  }, [isAuthReady, load]);

  // Returning from Unipile hosted auth — the notify webhook may land a moment
  // after the redirect, so refetch shortly after.
  useEffect(() => {
    if (!isAuthReady || params.get("connected") !== "1") return;
    const t = setTimeout(() => void load(), 1500);
    return () => clearTimeout(t);
  }, [isAuthReady, params, load]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await connectLinkedIn();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm("Disconnect this LinkedIn account? Workflow LinkedIn steps that send from it will skip until it's reconnected.")) return;
    setBusyId(id);
    try {
      await disconnectLinkedInAccount(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const byUser = new Map(accounts.map((a) => [a.userId, a]));

  return (
    <section className="space-y-4">
      {/* Connect card */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
            <Linkedin size={16} className="text-accent" /> LinkedIn
          </h3>
          <p className="text-[11.5px] text-ink-muted mt-1 max-w-[560px]">
            Connect your own LinkedIn to power automated outreach — connection requests, profile visits and
            messages run from workflow steps. Login and 2FA happen securely on Unipile; we never see your password.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {connecting ? <Loader2 size={13} className="animate-spin" /> : <Linkedin size={13} />}
          Connect my LinkedIn
        </button>
      </div>

      {/* Team table */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="mb-3">
          <h3 className="text-[13px] font-semibold text-ink">Team accounts</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">Who has connected LinkedIn and their daily send limits.</p>
        </div>

        <div className="rounded-[14px] border border-border-subtle overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
                <TableHead className="text-left">Member</TableHead>
                <TableHead className="text-left">LinkedIn account</TableHead>
                <TableHead className="text-left">Today&apos;s usage</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const acc = byUser.get(member.id);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="text-[12px] font-medium text-ink">{memberName(member)}</p>
                      <p className="text-[10px] text-ink-muted">{member.email}</p>
                    </TableCell>
                    <TableCell>
                      {acc ? (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink">
                          {acc.name || "LinkedIn account"}
                          {acc.profileUrl && (
                            <a href={acc.profileUrl} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-accent">
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-faint">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {acc?.usage ? (
                        <div className="flex items-center gap-3">
                          <Meter label="Invites" used={acc.usage.invitations.today} limit={acc.usage.invitations.dailyLimit} />
                          <Meter label="Messages" used={acc.usage.messages.today} limit={acc.usage.messages.dailyLimit} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-faint">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {acc ? (
                        <div className="inline-flex items-center gap-2">
                          {acc.status === "error" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-signal-red-text" title={acc.lastError || "Reconnect needed"}>
                              <AlertTriangle size={12} /> Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-signal-green-text">
                              <CheckCircle2 size={12} /> Connected
                            </span>
                          )}
                          <button
                            onClick={() => handleDisconnect(acc.id)}
                            disabled={busyId === acc.id}
                            title="Disconnect"
                            className="p-1 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 disabled:opacity-50"
                          >
                            {busyId === acc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                          <div className="w-1.5 h-1.5 rounded-full bg-border-default" /> Not connected
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-[12px] text-ink-muted">No team members yet. Add members in the Team tab.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
