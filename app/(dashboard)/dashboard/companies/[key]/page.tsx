"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getUniversalCompanyProfile,
  type CompanyProfileContact,
  type ContactEnrollment,
} from "@/lib/api/company-profile";

/**
 * Company resolver — there is no standalone company page. Clicking a company
 * anywhere (companies list, global search, inbox, scrapers) lands here and is
 * redirected straight into the LEAD VIEW of the company's most recently
 * active enrollment, so every entry point opens the same rich profile.
 * `?contact=<personKey>` (legacy search deep-links) prefers that person's
 * enrollments. Companies with no campaign contacts get a small notice —
 * there is no lead to open yet.
 */
export default function CompanyResolverPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const companyId = decodeURIComponent(params.key as string);
  const contactKey = searchParams.get("contact");

  const [state, setState] = useState<"resolving" | "empty" | "error">("resolving");
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUniversalCompanyProfile(companyId);
        if (cancelled) return;
        setCompanyName(profile.company.name);

        // Prefer the deep-linked contact's enrollments when present.
        const preferred = contactKey
          ? profile.contacts.find((c: CompanyProfileContact) => c.personKey === contactKey)
          : undefined;
        const pool = preferred?.enrollments.length
          ? preferred.enrollments
          : profile.contacts.flatMap((c) => c.enrollments);

        const best = pool.reduce<ContactEnrollment | null>((acc, e) => {
          const t = Date.parse(e.lastActivityAt ?? e.addedAt) || 0;
          const accT = acc ? Date.parse(acc.lastActivityAt ?? acc.addedAt) || 0 : -1;
          return t > accT ? e : acc;
        }, null);

        if (best) {
          router.replace(`/dashboard/funnels/${best.funnelId}/leads/${best.leadId}?from=companies`);
        } else {
          setState("empty");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, companyId, contactKey, router]);

  if (state === "resolving") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={18} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto mt-16">
      <div className="card-brand bg-surface rounded-[14px] p-10 text-center">
        <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-section mx-auto mb-4">
          <Building2 size={22} className="text-ink-muted" />
        </div>
        {state === "empty" ? (
          <>
            <p className="text-[15px] font-semibold text-ink">{companyName || "This company"}</p>
            <p className="text-[12px] text-ink-muted mt-1.5 max-w-[340px] mx-auto">
              No contacts in any campaign yet — import leads or add contacts from a campaign to
              open its profile.
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-ink">Company not found</p>
            <p className="text-[12px] text-ink-muted mt-1.5">
              It may have been removed, or the link is out of date.
            </p>
          </>
        )}
        <Link
          href="/dashboard/leads"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={12} />
          Back to Leads
        </Link>
      </div>
    </div>
  );
}
