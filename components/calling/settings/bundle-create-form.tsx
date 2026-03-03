"use client";

import { useState } from "react";

interface BundleCreateFormProps {
  defaultCountry?: string;
  onCancel: () => void;
  onCreate: (data: { businessName: string; businessAddress: string; country: string; identityDocumentName: string }) => void;
}

export function BundleCreateForm({ defaultCountry = "", onCancel, onCreate }: BundleCreateFormProps) {
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [identityDocumentName, setIdentityDocumentName] = useState("");

  function handleSubmit() {
    if (!businessName.trim() || !country.trim()) return;
    onCreate({ businessName, businessAddress, country, identityDocumentName });
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-section/50 p-3 space-y-3">
      <p className="text-[12px] font-medium text-ink">Create Regulatory Bundle</p>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Business Name
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Inc."
          className="w-full px-3 py-2 rounded-[10px] bg-surface text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Business Address
        </label>
        <input
          type="text"
          value={businessAddress}
          onChange={(e) => setBusinessAddress(e.target.value)}
          placeholder="123 Main St, City, State"
          className="w-full px-3 py-2 rounded-[10px] bg-surface text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Country
        </label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="United States"
          className="w-full px-3 py-2 rounded-[10px] bg-surface text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Identity Document Name
        </label>
        <input
          type="text"
          value={identityDocumentName}
          onChange={(e) => setIdentityDocumentName(e.target.value)}
          placeholder="EIN Certificate, Company Registration, etc."
          className="w-full px-3 py-2 rounded-[10px] bg-surface text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!businessName.trim() || !country.trim()}
          className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create Bundle
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
