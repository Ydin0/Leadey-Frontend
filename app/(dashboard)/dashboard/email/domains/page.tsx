"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  AtSign,
  ShieldCheck,
  AlertTriangle,
  Link2,
  ShoppingCart,
  ChevronDown,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { PageHead } from "@/components/email/page-head";
import { Stat, Chip, Donut, type Tone } from "@/components/email/ui";
import { Modal, ModalHeader } from "@/components/email/modal";
import {
  listEmailDomains,
  createEmailDomain,
} from "@/lib/api/email-domains";
import type { DnsState, EmailDomain } from "@/lib/types/email-domain";

function DnsBadge({ state }: { state: DnsState }) {
  const map: Record<DnsState, [Tone, React.ReactNode, string]> = {
    pass: ["green", <Check key="i" size={10} strokeWidth={2} />, "Pass"],
    warn: ["blue", <AlertTriangle key="i" size={10} strokeWidth={2} />, "Warn"],
    fail: ["red", <Check key="i" size={10} strokeWidth={2} />, "Fail"],
  };
  const [tone, icon, label] = map[state] || map.warn;
  return (
    <Chip tone={tone}>
      {icon}
      {label}
    </Chip>
  );
}

function donutColor(health: number): string {
  if (health >= 90) return "var(--color-signal-green-text)";
  if (health >= 70) return "var(--color-accent)";
  return "var(--color-signal-red-text)";
}

function healthTone(status: string): string {
  if (status === "healthy") return "bg-signal-green text-signal-green-text";
  if (status === "warning") return "bg-signal-blue text-signal-blue-text";
  return "bg-signal-red text-signal-red-text";
}

export default function EmailDomainsPage() {
  const isAuthReady = useAuthReady();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function reload() {
    try {
      setDomains(await listEmailDomains());
    } catch {
      // leave existing
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady) return;
    void reload();
  }, [isAuthReady]);

  const healthy = domains.filter((d) => d.status === "healthy").length;
  const totalMailboxes = 0; // populated once mailboxes link to domains
  const avgHealth = domains.length
    ? Math.round(domains.reduce((s, d) => s + d.health, 0) / domains.length)
    : 0;
  const needAttention = domains.filter((d) => d.status !== "healthy").length;

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <PageHead
        eyebrow="Cold email"
        title="Domains"
        subtitle="Sending domains and their DNS authentication. Healthy SPF, DKIM & DMARC records are what keep you out of spam."
        actions={
          <>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-full bg-section border border-border-subtle text-[12px] font-medium text-ink-secondary hover:bg-hover transition-colors"
            >
              <Link2 size={13} />
              Connect domain
            </button>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-full bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
            >
              <ShoppingCart size={13} />
              Buy domain
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-[22px]">
        <Stat icon={Globe} label="Domains" value={domains.length} sub={`${healthy} fully healthy`} />
        <Stat icon={AtSign} label="Mailboxes" value={totalMailboxes} sub="across all domains" tone="blue" />
        <Stat icon={ShieldCheck} label="Avg health" value={avgHealth} sub="DNS + reputation" tone="green" />
        <Stat icon={AlertTriangle} label="Need attention" value={needAttention} sub="domains with issues" tone="red" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      ) : domains.length === 0 ? (
        <div className="bg-surface rounded-[14px] border border-border-subtle p-10 text-center">
          <p className="text-[13px] text-ink">No domains yet</p>
          <p className="text-[11px] text-ink-muted mt-1">
            Connect or buy a sending domain to start cold emailing.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {domains.map((d) => (
            <div key={d.id} className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden">
              <div
                onClick={() => setOpen(open === d.id ? null : d.id)}
                className="p-4 cursor-pointer grid items-center gap-3"
                style={{ gridTemplateColumns: "minmax(0,1.6fr) 70px repeat(4, minmax(0,80px)) 90px 30px" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("flex items-center justify-center w-[34px] h-[34px] rounded-[9px] shrink-0", healthTone(d.status))}>
                    <Globe size={16} />
                  </span>
                  <div className="min-w-0">
                    <span className="truncate font-mono text-[13px] font-semibold text-ink block">{d.name}</span>
                    <div className="text-[10px] text-ink-faint">
                      {d.client || "—"} · {d.age}
                    </div>
                  </div>
                </div>
                <div className="text-center flex justify-center">
                  <Donut value={d.health} size={42} stroke={5} color={donutColor(d.health)} label={d.health} />
                </div>
                {([["SPF", d.spf], ["DKIM", d.dkim], ["DMARC", d.dmarc], ["MX", d.mx]] as [string, DnsState][]).map(
                  ([l, s]) => (
                    <div key={l} className="text-center">
                      <div className="text-[9px] text-ink-faint uppercase tracking-[0.06em] mb-1">{l}</div>
                      <DnsBadge state={s} />
                    </div>
                  ),
                )}
                <div className="text-center">
                  <Chip tone="slate">{d.purchased ? "Leadey" : "External"}</Chip>
                </div>
                <ChevronDown
                  size={16}
                  className="text-ink-muted transition-transform"
                  style={{ transform: open === d.id ? "rotate(180deg)" : "none" }}
                />
              </div>

              {open === d.id && (
                <div className="px-4 pb-4 border-t border-border-subtle">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium pt-3.5 pb-2.5 px-0.5">
                    DNS records
                  </div>
                  <div className="flex flex-col gap-2">
                    {d.dnsRecords.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 bg-section rounded-lg"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-[52px] rounded-full bg-surface text-ink-muted text-[10px] font-medium py-0.5">
                            {r.type}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12px] text-ink font-medium">{r.label}</div>
                            <div className="truncate font-mono text-[10.5px] text-ink-faint max-w-[420px]">{r.value}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <DnsBadge state={r.state} />
                          <button
                            onClick={() => copyValue(d.id + r.label, r.value)}
                            className="text-ink-muted hover:text-ink transition-colors"
                            title="Copy"
                          >
                            {copied === d.id + r.label ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {d.status !== "healthy" && (
                    <div className="flex items-center justify-between mt-3 p-3 bg-signal-red rounded-[10px]">
                      <span className="flex items-center gap-2 text-[12px] text-signal-red-text">
                        <AlertTriangle size={14} />
                        {d.status === "critical"
                          ? "Authentication failing — verify your DNS records."
                          : "DNS records pending verification — add them at your registrar."}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AddDomainModal
          onClose={() => setModal(false)}
          onCreated={() => {
            setModal(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function AddDomainModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(purchased: boolean) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter a domain name");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEmailDomain({ name: trimmed, client: client.trim(), purchased });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add a domain" onClose={onClose} />
      <div className="p-[18px] flex flex-col gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Domain</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="getyourcompany.com"
            className="w-full mt-1.5 px-3 py-2 rounded-lg bg-section border border-border-subtle text-[13px] text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">Client (optional)</label>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Acme Cloud"
            className="w-full mt-1.5 px-3 py-2 rounded-lg bg-section border border-border-subtle text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>

        <button
          onClick={() => create(true)}
          disabled={saving}
          className="flex items-center justify-between p-4 rounded-xl bg-section border border-accent w-full text-left disabled:opacity-60"
        >
          <span className="flex items-center gap-3.5">
            <span className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-surface text-accent">
              <ShoppingCart size={18} />
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">Buy a domain through Leadey</span>
              <span className="text-[11.5px] text-ink-faint">Auto-configured DNS · from $9/yr · ready in minutes</span>
            </span>
          </span>
          {saving ? <Loader2 size={16} className="animate-spin text-ink-muted" /> : null}
        </button>
        <button
          onClick={() => create(false)}
          disabled={saving}
          className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border-subtle w-full text-left disabled:opacity-60"
        >
          <span className="flex items-center gap-3.5">
            <span className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-section text-accent">
              <Link2 size={18} />
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">Connect a domain you own</span>
              <span className="text-[11.5px] text-ink-faint">We&apos;ll generate the DNS records to paste in your registrar</span>
            </span>
          </span>
        </button>

        {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
      </div>
    </Modal>
  );
}
