"use client";

import { useParams } from "next/navigation";
import { CompanyProfileShell } from "@/components/companies/company-profile-shell";

/**
 * Universal company profile — org-wide: every contact across all campaigns +
 * the merged cross-campaign activity timeline. `key` is the canonical company
 * id (master_companies.id).
 */
export default function CompanyProfilePage() {
  const params = useParams();
  const companyId = decodeURIComponent(params.key as string);
  return <CompanyProfileShell companyId={companyId} />;
}
