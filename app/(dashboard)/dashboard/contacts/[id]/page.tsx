"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, Linkedin, Ban, Loader2, Building2, MapPin, Rocket, Check,
} from "lucide-react";
import { cn, formatPhoneIntl, formatCallDuration } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { useCallContext } from "@/components/calling/call-context";
import { getContactProfile, sendContactsToFunnel, type ContactProfile } from "@/lib/api/contacts";
import { listFunnels } from "@/lib/api/funnels";
import type { Funnel } from "@/lib/types/funnel";

export default function ContactProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const isAuthReady = useAuthReady();
  const { startCall } = useCallContext();

  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getContactProfile(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
    listFunnels().then(setFunnels).catch(() => {});
  }, [isAuthReady, load]);

  async function addToCampaign(funnelId: string) {
    if (!funnelId) return;
    setAdding(true);
    try {
      await sendContactsToFunnel(funnelId, { contactIds: [id] });
      setAdded(funnelId);
      await load();
    } catch {
      /* swallow — banner stays */
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="rounded-[14px] border border-border-subtle bg-surface p-6"><p className="text-[12px] text-ink-muted">Loading contact…</p></div>;
  }
  if (error || !profile) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load contact</p>
        <p className="text-[11px] text-ink-secondary mb-3">{error || "Not found."}</p>
        <Link href="/dashboard/leads" className="text-[11px] text-signal-blue-text hover:underline">Back to Leads</Link>
      </div>
    );
  }

  const p = profile;
  const initials = (p.fullName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const canCall = !!p.phone && !p.doNotCall;

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Leads
      </Link>

      {/* Header */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5 mb-4">
        <div className="flex items-start gap-4">
          {p.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profileImageUrl} alt={p.fullName || ""} className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-signal-blue flex items-center justify-center shrink-0">
              <span className="text-[16px] font-semibold text-signal-blue-text">{initials}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className={cn("text-[18px] font-semibold", p.doNotCall ? "text-signal-red-text" : "text-ink")}>{p.fullName || "Unknown contact"}</h1>
              {p.doNotCall && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-red/10 text-signal-red-text text-[10px] font-semibold uppercase"><Ban size={10} /> DNC</span>
              )}
            </div>
            <p className="text-[13px] text-ink-secondary mt-0.5">{[p.title, p.company].filter(Boolean).join(" · ") || p.headline || "—"}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink-muted">
              {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>}
              {p.company && (
                <Link href={`/dashboard/companies/${encodeURIComponent(p.companyDomain || p.companyLinkedinUrl || p.company)}`} className="inline-flex items-center gap-1 hover:text-ink-secondary">
                  <Building2 size={11} /> {p.company}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => p.phone && startCall(p.phone, { contactName: p.fullName, companyName: p.company })}
            disabled={!canCall}
            className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[12px] font-medium transition-colors",
              canCall ? "bg-signal-green text-signal-green-text hover:opacity-90" : "bg-section text-ink-faint cursor-not-allowed")}
          >
            <Phone size={13} /> Call
          </button>
          {p.email ? (
            <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-blue text-signal-blue-text text-[12px] font-medium hover:opacity-90"><Mail size={13} /> Email</a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-faint text-[12px] font-medium cursor-not-allowed"><Mail size={13} /> Email</span>
          )}
          {p.linkedinUrl && (
            <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-[#0A66C2] text-[12px] font-medium hover:bg-hover"><Linkedin size={13} /> LinkedIn</a>
          )}
          {/* Add to campaign */}
          <div className="inline-flex items-center gap-1.5 ml-auto">
            {added ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-green/15 text-signal-green-text text-[12px] font-medium"><Check size={13} /> Added</span>
            ) : (
              <>
                <Rocket size={13} className="text-ink-muted" />
                <select
                  defaultValue=""
                  disabled={adding}
                  onChange={(e) => void addToCampaign(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[10px] bg-section text-[12px] text-ink border border-border-subtle outline-none focus:border-accent"
                >
                  <option value="" disabled>Add to campaign…</option>
                  {funnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                {adding && <Loader2 size={13} className="animate-spin text-ink-muted" />}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact details */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Contact</h3>
          <div className="flex flex-col gap-2 text-[12px]">
            <Row label="Email" value={p.email || "—"} hint={p.emailStatus} />
            <Row label="Phone" value={p.phone ? formatPhoneIntl(p.phone) || p.phone : "—"} hint={p.phoneStatus} />
            <Row label="Enrichment" value={p.enrichmentStatus} />
            <Row label="Status" value={p.status} />
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Campaigns ({p.campaigns.length})</h3>
          {p.campaigns.length === 0 ? (
            <p className="text-[12px] text-ink-muted">Not in any campaign yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {p.campaigns.map((c) => (
                <Link key={c.leadId} href={`/dashboard/leads/${c.leadId}?c=${c.funnelId}`} className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-section hover:bg-hover transition-colors">
                  <span className="text-[12px] text-ink truncate">{c.funnelName}</span>
                  <span className="text-[10px] text-ink-muted">{c.status} · {c.currentStep}/{c.totalSteps}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call activity */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4 mt-4">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Call activity ({p.callsTotal})</h3>
        {p.calls.length === 0 ? (
          <p className="text-[12px] text-ink-muted">No calls logged.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {p.calls.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-hover/50 text-[12px]">
                <span className="inline-flex items-center gap-2 text-ink-secondary">
                  <Phone size={12} className="text-signal-green-text" /> {c.number} <span className="text-ink-faint capitalize">{c.direction}</span>
                </span>
                <span className="text-ink-muted tabular-nums">{formatCallDuration(c.duration)} · {c.calledAt ? new Date(c.calledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink truncate max-w-[220px]">
        {value}
        {hint && <span className="ml-1.5 text-[10px] text-ink-faint">({hint})</span>}
      </span>
    </div>
  );
}
