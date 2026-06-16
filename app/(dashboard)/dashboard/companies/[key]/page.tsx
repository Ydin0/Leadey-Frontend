"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Linkedin, MapPin } from "lucide-react";
import { CompanyAvatar } from "@/components/funnels/focus/company-avatar";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { getCompanyProfile, type CompanyProfile } from "@/lib/api/contacts";

export default function CompanyProfilePage() {
  const params = useParams();
  const key = decodeURIComponent(params.key as string);
  const isAuthReady = useAuthReady();

  const [data, setData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCompanyProfile(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!isAuthReady) return;
    void load();
  }, [isAuthReady, load]);

  if (loading) {
    return <div className="rounded-[14px] border border-border-subtle bg-surface p-6"><p className="text-[12px] text-ink-muted">Loading company…</p></div>;
  }
  if (error || !data) {
    return (
      <div className="rounded-[14px] border border-signal-red-text/25 bg-signal-red/10 p-5">
        <p className="text-[12px] font-medium text-signal-red-text mb-2">Could not load company</p>
        <p className="text-[11px] text-ink-secondary mb-3">{error || "Not found."}</p>
        <Link href="/dashboard/leads" className="text-[11px] text-signal-blue-text hover:underline">Back to Leads</Link>
      </div>
    );
  }

  const c = data.company;
  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Leads
      </Link>

      <div className="bg-surface rounded-[14px] border border-border-subtle p-5 mb-4">
        <div className="flex items-start gap-4">
          <CompanyAvatar name={c.name} size="lg" domain={c.domain ?? undefined} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-semibold text-ink">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-ink-muted">
              {c.domain && <span>{c.domain}</span>}
              {c.industry && <span>{c.industry}</span>}
              {c.employeeCount != null && <span className="inline-flex items-center gap-1"><Users size={11} /> {c.employeeCount.toLocaleString()}</span>}
              {c.fundingStage && <span className="capitalize">{c.fundingStage.replace(/_/g, " ")}</span>}
              {(c.city || c.country) && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {[c.city, c.country].filter(Boolean).join(", ")}</span>}
              {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0A66C2] hover:underline"><Linkedin size={11} /> LinkedIn</a>}
            </div>
            {c.description && <p className="text-[12px] text-ink-secondary mt-2 line-clamp-3">{c.description}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Discovered contacts */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Contacts ({data.contacts.length})</h3>
          {data.contacts.length === 0 ? (
            <p className="text-[12px] text-ink-muted">No discovered contacts.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {data.contacts.map((ct) => (
                <Link key={ct.id} href={`/dashboard/contacts/${ct.id}`} className="flex items-center justify-between px-3 py-2 rounded-[10px] hover:bg-hover/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink truncate">{ct.fullName || "—"}</div>
                    <div className="text-[10px] text-ink-muted truncate">{ct.title || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px]">
                    {ct.email && <span className="text-signal-blue-text">email</span>}
                    {ct.phone && <span className="text-signal-green-text">phone</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Campaign leads */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">In campaigns ({data.leads.length})</h3>
          {data.leads.length === 0 ? (
            <p className="text-[12px] text-ink-muted">No campaign leads at this company.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {data.leads.map((l) => (
                <Link key={l.leadId} href={`/dashboard/leads/${l.leadId}?c=${l.funnelId}`} className="flex items-center justify-between px-3 py-2 rounded-[10px] hover:bg-hover/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink truncate">{l.name}</div>
                    <div className="text-[10px] text-ink-muted truncate">{l.title}</div>
                  </div>
                  <span className="text-[10px] text-ink-muted shrink-0">{l.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
