"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Flame,
  ShieldCheck,
  Send,
  Link2,
  ShoppingCart,
  RefreshCw,
  Server,
  Mail,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { PageHead } from "@/components/email/page-head";
import { Stat, Chip, Bar, type Tone } from "@/components/email/ui";
import { Modal, ModalHeader } from "@/components/email/modal";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  listEmailMailboxes,
  createEmailMailbox,
  syncEmailMailboxes,
} from "@/lib/api/email-mailboxes";
import { listEmailDomains } from "@/lib/api/email-domains";
import { getTeamMembers } from "@/lib/api/team";
import type { EmailMailbox } from "@/lib/types/email-mailbox";
import type { EmailDomain } from "@/lib/types/email-domain";
import type { TeamMember } from "@/lib/types/team";

const MARKETPLACE = [
  { id: "google", name: "Google Workspace", per: 4.0, desc: "Real Google Workspace mailboxes on your domain.", recommended: true },
  { id: "ms", name: "Microsoft 365", per: 3.5, desc: "Outlook mailboxes with native deliverability.", recommended: false },
  { id: "smtp", name: "Leadey SMTP", per: 2.0, desc: "Budget SMTP inboxes for high volume.", recommended: false },
];

function memberName(m: TeamMember): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return full || m.email;
}

export default function EmailMailboxesPage() {
  const isAuthReady = useAuthReady();
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([]);
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState<"connect" | "buy" | null>(null);

  const teamById = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  async function reload() {
    try {
      const [mb, dm] = await Promise.all([listEmailMailboxes(), listEmailDomains()]);
      setMailboxes(mb);
      setDomains(dm);
    } catch {
      // leave existing
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
    void getTeamMembers()
      .then((r) => setTeam(r.members))
      .catch(() => {});
  }, [isAuthReady]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncEmailMailboxes();
      setMailboxes(res.mailboxes);
    } catch {
      // ignore — likely Smartlead not connected
    } finally {
      setSyncing(false);
    }
  }

  const active = mailboxes.filter((m) => m.status === "active").length;
  const ramping = mailboxes.filter((m) => m.warmup === "ramp").length;
  const avgRep = mailboxes.length
    ? Math.round(mailboxes.reduce((s, m) => s + m.reputation, 0) / mailboxes.length)
    : 0;
  const sentToday = mailboxes.reduce((s, m) => s + m.sentToday, 0);

  const warmTone = (m: EmailMailbox): Tone => (m.warmup === "on" ? "green" : m.warmup === "ramp" ? "blue" : "slate");
  const warmLabel = (m: EmailMailbox) => (m.warmup === "on" ? "Warmed" : m.warmup === "ramp" ? "Ramping" : "Off");
  const repColor = (n: number) => (n >= 90 ? "text-signal-green-text" : n >= 70 ? "text-signal-blue-text" : "text-signal-red-text");

  return (
    <div>
      <PageHead
        eyebrow="Cold email"
        title="Email Accounts"
        subtitle="Mailboxes that send your campaigns. Connect your own, or buy ready-to-send accounts through Leadey."
        actions={
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-full bg-section border border-border-subtle text-[12px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-60"
            >
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Sync
            </button>
            <button
              onClick={() => setModal("connect")}
              className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-full bg-section border border-border-subtle text-[12px] font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <Link2 size={13} />
              Connect existing
            </button>
            <button
              onClick={() => setModal("buy")}
              className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-full bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
            >
              <ShoppingCart size={13} />
              Buy mailboxes
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-[22px]">
        <Stat icon={AtSign} label="Total accounts" value={mailboxes.length} sub={`${active} active`} />
        <Stat icon={Flame} label="Warming up" value={ramping} sub="ramping to full volume" tone="blue" />
        <Stat icon={ShieldCheck} label="Avg reputation" value={avgRep} sub="across all mailboxes" tone="green" />
        <Stat icon={Send} label="Sent today" value={sentToday} sub="across all accounts" />
      </div>

      <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        ) : mailboxes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[13px] text-ink">No mailboxes yet</p>
            <p className="text-[11px] text-ink-muted mt-1">
              Connect an existing mailbox, buy ready-made accounts, or Sync from Smartlead.
            </p>
          </div>
        ) : (
          <Table className="w-full text-[12px]">
            <TableHeader>
              <TableRow>
                <TableHead>Mailbox</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Warmup</TableHead>
                <TableHead className="text-right">Sent today</TableHead>
                <TableHead className="text-right">Reputation</TableHead>
                <TableHead>Assigned to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailboxes.map((m) => {
                const u = m.assignedTo ? teamById.get(m.assignedTo) : undefined;
                return (
                  <TableRow key={m.id} className={cn(m.status === "disconnected" && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-section text-accent shrink-0">
                          <AtSign size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-ink font-medium truncate">{m.email}</div>
                          <div className="text-[10px] text-ink-faint truncate">
                            {[m.name, domainOf(m, domains)].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{m.provider}</TableCell>
                    <TableCell>
                      {m.status === "disconnected" ? (
                        <Chip tone="red">Disconnected</Chip>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Chip tone={warmTone(m)}>
                            <Flame size={10} />
                            {warmLabel(m)}
                          </Chip>
                          {m.warmup !== "off" && (
                            <span className="text-[11px] text-ink-muted">{m.warmScore}</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-ink-secondary">
                          {m.sentToday}/{m.dailyLimit}
                        </span>
                        <div className="w-11">
                          <Bar value={(m.sentToday / Math.max(1, m.dailyLimit)) * 100} height={5} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("font-semibold", repColor(m.reputation))}>{m.reputation}</span>
                    </TableCell>
                    <TableCell>
                      {u ? (
                        <span className="flex items-center gap-2">
                          <MemberAvatar id={u.id} name={memberName(u)} />
                          <span className="text-[11.5px] text-ink-secondary">{memberName(u).split(" ")[0]}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-faint">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {modal === "connect" && (
        <ConnectModal
          domains={domains}
          onClose={() => setModal(null)}
          onConnected={() => {
            setModal(null);
            void reload();
          }}
        />
      )}
      {modal === "buy" && <BuyModal domains={domains} onClose={() => setModal(null)} />}
    </div>
  );
}

function domainOf(m: EmailMailbox, domains: EmailDomain[]): string {
  if (m.domainId) return domains.find((d) => d.id === m.domainId)?.name || "";
  return m.email.split("@")[1] || "";
}

function ConnectModal({
  domains,
  onClose,
  onConnected,
}: {
  domains: EmailDomain[];
  onClose: () => void;
  onConnected: () => void;
}) {
  const providers = [
    { id: "Google", name: "Google Workspace / Gmail", desc: "Connect a Google mailbox", icon: Mail },
    { id: "Outlook", name: "Microsoft 365 / Outlook", desc: "Connect a Microsoft mailbox", icon: Mail },
    { id: "SMTP", name: "Any SMTP / IMAP", desc: "Host, port & credentials", icon: Server },
  ];
  const [provider, setProvider] = useState("Google");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    const e = email.trim().toLowerCase();
    if (!e) {
      setError("Enter the mailbox email");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEmailMailbox({ email: e, name: name.trim(), provider, domainId: domainId || null });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect mailbox");
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Connect an existing mailbox" onClose={onClose} />
      <div className="p-[18px] flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {providers.map((o) => {
            const Icon = o.icon;
            const on = provider === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setProvider(o.id)}
                className={cn(
                  "flex flex-col items-start gap-2 p-3 rounded-xl border text-left",
                  on ? "bg-section border-accent" : "bg-surface border-border-subtle hover:bg-hover",
                )}
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-section text-accent">
                  <Icon size={16} />
                </span>
                <span className="text-[11.5px] font-semibold text-ink leading-tight">{o.name}</span>
                <span className="text-[10px] text-ink-faint">{o.desc}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Mailbox email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ben@getyourcompany.com"
            className="w-full mt-1.5 px-3 py-2 rounded-lg bg-section border border-border-subtle text-[13px] text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
        <div className="flex gap-3">
          <div className="grow">
            <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Sender name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ben Carter"
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-section border border-border-subtle text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
          </div>
          <div className="grow">
            <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Domain</label>
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-section border border-border-subtle text-[13px] text-ink focus:outline-none focus:border-border-default"
            >
              <option value="">Auto (from email)</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-[11px] text-signal-red-text">{error}</p>}

        <button
          onClick={connect}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 py-3 rounded-full bg-ink text-on-ink text-[13px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Connect mailbox
        </button>
        <p className="text-[11px] text-ink-faint">
          New mailboxes start a 2–3 week warmup automatically before sending campaigns.
        </p>
      </div>
    </Modal>
  );
}

function BuyModal({ domains, onClose }: { domains: EmailDomain[]; onClose: () => void }) {
  const [provider, setProvider] = useState("google");
  const [qty, setQty] = useState(6);
  const [domain, setDomain] = useState(domains[0]?.name || "");
  const p = MARKETPLACE.find((x) => x.id === provider)!;
  const monthly = (p.per * qty).toFixed(2);

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title="Buy mailboxes through Leadey"
        subtitle="Provisioned, authenticated & warmed automatically."
        onClose={onClose}
      />
      <div className="p-[18px] flex flex-col gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Provider</label>
          <div className="flex flex-col gap-2 mt-2">
            {MARKETPLACE.map((o) => (
              <button
                key={o.id}
                onClick={() => setProvider(o.id)}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border text-left w-full",
                  provider === o.id ? "bg-section border-accent" : "bg-surface border-border-subtle hover:bg-hover",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{o.name}</span>
                    {o.recommended && <Chip tone="green">Recommended</Chip>}
                  </span>
                  <span className="block text-[11.5px] text-ink-faint mt-0.5">{o.desc}</span>
                </span>
                <span className="text-right shrink-0 pl-3">
                  <span className="text-[15px] font-semibold text-ink">${o.per.toFixed(2)}</span>
                  <span className="block text-[10px] text-ink-faint">/mbox/mo</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="grow">
            <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">On domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-lg bg-section border border-border-subtle text-[13px] text-ink focus:outline-none focus:border-border-default"
            >
              {domains.length === 0 && <option value="">Add a domain first</option>}
              {domains.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[150px]">
            <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Quantity</label>
            <div className="flex items-center justify-between mt-2 px-2 py-1.5 bg-section rounded-lg border border-border-subtle">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-surface text-ink-secondary"
              >
                <Minus size={14} />
              </button>
              <span className="text-[15px] font-semibold text-ink">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-surface text-ink-secondary"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-section rounded-xl">
          <div className="flex items-center justify-between text-[12.5px] text-ink-muted mb-2">
            <span>
              {qty} × {p.name}
            </span>
            <span>${monthly}/mo</span>
          </div>
          <div className="flex items-center justify-between text-[12.5px] text-ink-muted mb-2">
            <span>Auto-warmup</span>
            <span className="text-signal-green-text">Included</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-border-default">
            <span className="text-[13px] font-semibold text-ink">Total</span>
            <span className="text-[17px] font-bold text-ink">
              ${monthly}
              <span className="text-[11px] text-ink-faint font-normal">/mo</span>
            </span>
          </div>
        </div>

        <button
          disabled
          title="Mailbox provisioning is coming soon"
          className="flex items-center justify-center gap-1.5 py-3 rounded-full bg-ink text-on-ink text-[13px] font-medium opacity-60 cursor-not-allowed"
        >
          <ShoppingCart size={14} />
          Purchase {qty} mailboxes
        </button>
        <p className="text-[11px] text-ink-faint text-center">
          Provisioning is being wired up — connect existing mailboxes or sync from Smartlead for now.
        </p>
      </div>
    </Modal>
  );
}
