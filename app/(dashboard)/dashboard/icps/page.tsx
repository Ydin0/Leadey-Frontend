"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { mockICPs } from "@/lib/mock-data/icps";
import { ICPCard } from "@/components/icps/icp-card";
import { ICPEmptyState } from "@/components/icps/icp-empty-state";

export default function ICPsPage() {
  const icps = mockICPs;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Ideal Customer Profiles</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">Define who you are targeting and watch leads flow in</p>
        </div>
        {icps.length > 0 && (
          <Link
            href="/dashboard/icps/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Create ICP
          </Link>
        )}
      </div>

      {icps.length === 0 ? (
        <ICPEmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {icps.map((icp) => (
            <ICPCard key={icp.id} icp={icp} />
          ))}
        </div>
      )}
    </div>
  );
}
