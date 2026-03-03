"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { mockBundles } from "@/lib/mock-data/calling";
import { BundleStatusBadge } from "@/components/calling/settings/bundle-status-badge";
import { BundleCreateForm } from "@/components/calling/settings/bundle-create-form";
import type { CountryOption, RegulatoryBundle } from "@/lib/types/calling";

interface StepSelectBundleProps {
  country: CountryOption | null;
  selectedBundleId: string | null;
  onSelect: (bundleId: string | null) => void;
  onSkip: () => void;
}

export function StepSelectBundle({ country, selectedBundleId, onSelect, onSkip }: StepSelectBundleProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [bundles, setBundles] = useState<RegulatoryBundle[]>(mockBundles);

  // Auto-skip if country doesn't require a bundle
  useEffect(() => {
    if (country && !country.bundleRequired) {
      onSkip();
    }
  }, [country, onSkip]);

  const countryBundles = bundles.filter((b) => b.countryCode === country?.code);

  function handleCreate(data: { businessName: string; businessAddress: string; country: string; identityDocumentName: string }) {
    const newBundle: RegulatoryBundle = {
      id: `bun_${Date.now()}`,
      name: `${data.country} Business Bundle`,
      country: data.country,
      countryCode: country?.code ?? "",
      status: "draft",
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      identityDocumentName: data.identityDocumentName,
      createdAt: new Date(),
    };
    setBundles((prev) => [newBundle, ...prev]);
    onSelect(newBundle.id);
    setShowCreate(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Regulatory Bundle</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">
          {country?.name} requires a regulatory bundle. Select an existing one or create a new one.
        </p>
      </div>

      {countryBundles.length > 0 && (
        <div className="space-y-2">
          {countryBundles.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              onClick={() => onSelect(bundle.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-[10px] border text-left transition-colors",
                selectedBundleId === bundle.id
                  ? "border-signal-blue-text bg-signal-blue"
                  : "border-border-subtle bg-section/50 hover:bg-hover"
              )}
            >
              <div>
                <p className="text-[12px] font-medium text-ink">{bundle.name}</p>
                <p className="text-[11px] text-ink-muted">{bundle.businessName}</p>
              </div>
              <BundleStatusBadge status={bundle.status} />
            </button>
          ))}
        </div>
      )}

      {countryBundles.length === 0 && !showCreate && (
        <div className="rounded-[10px] border border-border-subtle bg-section/50 p-6 text-center">
          <p className="text-[12px] text-ink-muted mb-3">No bundles found for {country?.name}.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            Create Bundle
          </button>
        </div>
      )}

      {!showCreate && countryBundles.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-[11px] text-signal-blue-text hover:underline"
        >
          Create a new bundle instead
        </button>
      )}

      {showCreate && (
        <BundleCreateForm
          defaultCountry={country?.name ?? ""}
          onCancel={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
