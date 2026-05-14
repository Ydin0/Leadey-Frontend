"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getTeamMembers } from "@/lib/api/team";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { TeamMember } from "@/lib/types/team";

function memberName(m: TeamMember): string {
  if (m.firstName || m.lastName) return `${m.firstName || ""} ${m.lastName || ""}`.trim();
  return m.email;
}

export function LinkedInTeamTab() {
  const isAuthReady = useAuthReady();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    getTeamMembers()
      .then((data) => setMembers(data.members))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthReady]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-ink">LinkedIn Connections</h3>
        <p className="text-[11px] text-ink-muted mt-0.5">
          Manage your team's LinkedIn integration and daily send limits.
        </p>
      </div>

      <div className="rounded-[14px] border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
              <TableHead className="text-left">Member</TableHead>
              <TableHead className="text-left">LinkedIn Account</TableHead>
              <TableHead className="text-left">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <p className="text-[12px] font-medium text-ink">{memberName(member)}</p>
                    <p className="text-[10px] text-ink-muted">{member.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-ink-faint">&mdash;</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-border-default" />
                    <span className="text-[11px] text-ink-muted">Not Connected</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <p className="text-[12px] text-ink-muted">No team members yet. Add members in the Team tab.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-ink-faint mt-3">
        LinkedIn connections will be available once team members connect their accounts via the Unipile integration.
      </p>
    </section>
  );
}
