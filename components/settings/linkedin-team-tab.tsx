import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { TeamMemberSettings } from "@/lib/types/settings";

interface LinkedInTeamTabProps {
  members: TeamMemberSettings[];
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-ink-secondary tabular-nums">
        {used}/{limit}
      </span>
      <div className="w-20 h-1.5 rounded bg-section">
        <div
          className={cn(
            "h-1.5 rounded",
            pct >= 90 ? "bg-signal-red-text" : "bg-signal-blue-text"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ConnectionStatus({
  connected,
  memberStatus,
}: {
  connected: boolean;
  memberStatus: TeamMemberSettings["status"];
}) {
  if (memberStatus === "invited") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
        <span className="text-[11px] text-ink-muted">Invited</span>
      </div>
    );
  }
  if (connected) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-signal-green-text" />
        <span className="text-[11px] text-ink-secondary">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-border-default" />
      <span className="text-[11px] text-ink-muted">Not Connected</span>
    </div>
  );
}

export function LinkedInTeamTab({ members }: LinkedInTeamTabProps) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-ink">
          LinkedIn Connections
        </h3>
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
              <TableHead className="text-left">Daily Usage</TableHead>
              <TableHead className="text-left">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <p className="text-[12px] font-medium text-ink">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-ink-muted">{member.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {member.linkedinConnected && member.linkedinAccountName ? (
                    <div>
                      <p className="text-[11px] text-ink-secondary">
                        {member.linkedinAccountName}
                      </p>
                      {member.linkedinLastSync && (
                        <p className="text-[10px] text-ink-faint">
                          Synced {formatRelativeTime(member.linkedinLastSync)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-faint">&mdash;</span>
                  )}
                </TableCell>
                <TableCell>
                  {member.linkedinConnected &&
                  member.linkedinDailyLimit != null &&
                  member.linkedinDailyUsed != null ? (
                    <UsageBar
                      used={member.linkedinDailyUsed}
                      limit={member.linkedinDailyLimit}
                    />
                  ) : (
                    <span className="text-[11px] text-ink-faint">&mdash;</span>
                  )}
                </TableCell>
                <TableCell>
                  <ConnectionStatus
                    connected={member.linkedinConnected}
                    memberStatus={member.status}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-ink-faint mt-3">
        Daily limits can be adjusted per team member. LinkedIn connections are
        managed via Unipile integration.
      </p>
    </section>
  );
}
