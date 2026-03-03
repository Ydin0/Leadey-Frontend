"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { mockBundles, mockCountryOptions } from "@/lib/mock-data/calling";
import { BundleStatusBadge } from "./bundle-status-badge";
import { BundleCreateForm } from "./bundle-create-form";
import type { RegulatoryBundle } from "@/lib/types/calling";

export function BundleManagement() {
  const [bundles, setBundles] = useState<RegulatoryBundle[]>(mockBundles);
  const [showCreate, setShowCreate] = useState(false);

  function handleCreate(data: { businessName: string; businessAddress: string; country: string; identityDocumentName: string }) {
    const countryOption = mockCountryOptions.find((c) => c.name === data.country);
    const newBundle: RegulatoryBundle = {
      id: `bun_${Date.now()}`,
      name: `${data.country} Business Bundle`,
      country: data.country,
      countryCode: countryOption?.code ?? "",
      status: "draft",
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      identityDocumentName: data.identityDocumentName,
      createdAt: new Date(),
    };
    setBundles((prev) => [newBundle, ...prev]);
    setShowCreate(false);
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Regulatory Bundles</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Manage compliance bundles required for international numbers.
          </p>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            New Bundle
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-4">
          <BundleCreateForm onCancel={() => setShowCreate(false)} onCreate={handleCreate} />
        </div>
      )}

      <div className="space-y-2">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-[14px]">
                {mockCountryOptions.find((c) => c.code === bundle.countryCode)?.flag ?? ""}
              </span>
              <div>
                <p className="text-[12px] text-ink font-medium">{bundle.name}</p>
                <p className="text-[11px] text-ink-muted">
                  {bundle.businessName} &middot; {formatRelativeTime(bundle.createdAt)}
                </p>
              </div>
            </div>
            <BundleStatusBadge status={bundle.status} />
          </div>
        ))}

        {bundles.length === 0 && (
          <p className="text-[12px] text-ink-muted text-center py-4">No bundles created yet.</p>
        )}
      </div>
    </section>
  );
}
