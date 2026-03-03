"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, Send } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { countryOptions } from "@/lib/constants/calling";
import { getBundles, createBundle, submitBundle, refreshBundleStatus } from "@/lib/api/phone-lines";
import { BundleStatusBadge } from "./bundle-status-badge";
import { BundleCreateForm } from "./bundle-create-form";
import type { RegulatoryBundle } from "@/lib/types/calling";

export function BundleManagement() {
  const [bundles, setBundles] = useState<RegulatoryBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    getBundles()
      .then(setBundles)
      .catch((err) => console.error("Failed to fetch bundles:", err))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: { businessName: string; businessAddress: string; country: string; identityDocumentName: string }) {
    const countryOption = countryOptions.find((c) => c.name === data.country);
    try {
      const newBundle = await createBundle({
        country: data.country,
        countryCode: countryOption?.code ?? "",
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        identityDocumentName: data.identityDocumentName,
      });
      setBundles((prev) => [newBundle, ...prev]);
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create bundle:", err);
    }
  }

  async function handleSubmit(bundleId: string) {
    setSubmittingId(bundleId);
    try {
      const result = await submitBundle(bundleId);
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, status: result.status as RegulatoryBundle["status"], twilioBundleSid: result.twilioBundleSid } : b))
      );
    } catch (err) {
      console.error("Failed to submit bundle:", err);
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRefresh(bundleId: string) {
    setRefreshingId(bundleId);
    try {
      const result = await refreshBundleStatus(bundleId);
      setBundles((prev) =>
        prev.map((b) => (b.id === bundleId ? { ...b, status: result.status as RegulatoryBundle["status"] } : b))
      );
    } catch (err) {
      console.error("Failed to refresh bundle status:", err);
    } finally {
      setRefreshingId(null);
    }
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

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      ) : (
        <div className="space-y-2">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-[14px]">
                  {countryOptions.find((c) => c.code === bundle.countryCode)?.flag ?? ""}
                </span>
                <div>
                  <p className="text-[12px] text-ink font-medium">{bundle.name}</p>
                  <p className="text-[11px] text-ink-muted">
                    {bundle.businessName} &middot; {formatRelativeTime(bundle.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bundle.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(bundle.id)}
                    disabled={submittingId === bundle.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-signal-blue text-signal-blue-text text-[10px] font-medium hover:bg-signal-blue/80 transition-colors disabled:opacity-50"
                  >
                    {submittingId === bundle.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Send size={11} strokeWidth={2} />
                    )}
                    Submit
                  </button>
                )}
                {bundle.status === "pending-review" && (
                  <button
                    type="button"
                    onClick={() => handleRefresh(bundle.id)}
                    disabled={refreshingId === bundle.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={11} strokeWidth={2} className={refreshingId === bundle.id ? "animate-spin" : ""} />
                    Refresh
                  </button>
                )}
                <BundleStatusBadge status={bundle.status} />
              </div>
            </div>
          ))}

          {bundles.length === 0 && (
            <p className="text-[12px] text-ink-muted text-center py-4">No bundles created yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
