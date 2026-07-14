"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WorkflowsView } from "@/components/funnels/workflows/workflows-view";

/** Org-level workflow builder — reuses the campaign builder with funnelId=null
 *  (which loads the org's org-level workflows) and opens the requested id. */
export default function OrgWorkflowBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  return (
    <div>
      <Link href="/dashboard/workflows" className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary hover:text-ink mb-3">
        <ChevronLeft size={14} /> All workflows
      </Link>
      <WorkflowsView funnelId={null} initialId={id} />
    </div>
  );
}
