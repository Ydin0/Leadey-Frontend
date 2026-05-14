"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Loader2,
  RefreshCw,
  Send,
  Upload,
  Trash2,
  Pencil,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { formatRelativeTime, cn } from "@/lib/utils";
import { countryOptions } from "@/lib/constants/calling";
import {
  getBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  submitBundle,
  refreshBundleStatus,
  getBundleDocuments,
  uploadBundleDocument,
  deleteBundleDocument,
} from "@/lib/api/phone-lines";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { BundleStatusBadge } from "./bundle-status-badge";
import { BundleCreateForm } from "./bundle-create-form";
import type { RegulatoryBundle, BundleDocument } from "@/lib/types/calling";

const REQUIRED_DOCS: Record<string, { type: string; label: string }[]> = {
  GB: [
    { type: "business_registration", label: "Business Registration (Companies House)" },
    { type: "utility_bill", label: "Proof of Address (utility bill or bank statement)" },
  ],
  DE: [
    { type: "business_registration", label: "Business Registration (Handelsregister)" },
    { type: "government_id", label: "Government-Issued ID" },
    { type: "utility_bill", label: "Proof of Address" },
  ],
  FR: [
    { type: "business_registration", label: "Business Registration (KBIS)" },
    { type: "government_id", label: "Government-Issued ID" },
    { type: "utility_bill", label: "Proof of Address" },
  ],
  AU: [
    { type: "business_registration", label: "Business Registration (ABN)" },
    { type: "government_id", label: "Government-Issued ID" },
  ],
  DEFAULT: [
    { type: "business_registration", label: "Business Registration" },
    { type: "government_id", label: "Government-Issued ID" },
    { type: "utility_bill", label: "Proof of Address" },
  ],
};

export function BundleManagement() {
  const isAuthReady = useAuthReady();
  const { orgId } = useAuth();
  const [bundles, setBundles] = useState<RegulatoryBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isAuthReady || !orgId) return;
    setError(null);
    try {
      const fresh = await getBundles();
      setBundles(fresh);
    } catch (err: any) {
      console.error("[BundleManagement] /bundles failed:", err);
      setError(err?.message || "Failed to load bundles");
    } finally {
      setLoading(false);
    }
  }, [isAuthReady, orgId]);

  // Wait for active org before firing the API call — without orgId the
  // backend returns an empty list and we end up showing "No bundles yet"
  // even when rows exist.
  useEffect(() => {
    if (!isAuthReady || !orgId) return;
    reload();
  }, [isAuthReady, orgId, reload]);

  async function handleCreate(data: Parameters<typeof createBundle>[0]) {
    try {
      const newBundle = await createBundle(data);
      setBundles((prev) => [newBundle, ...prev]);
      setShowCreate(false);
      setExpandedId(newBundle.id);
    } catch (err: any) {
      console.error("Failed to create bundle:", err);
      alert(err?.message || "Failed to create bundle.");
    }
  }

  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Regulatory Bundles</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Compliance bundles required for international numbers. Save as a
            draft, upload documents, then submit for Twilio review.
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
          <BundleCreateForm
            onCancel={() => setShowCreate(false)}
            onCreate={async (d) => {
              await handleCreate(d);
            }}
          />
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-3 py-2">
          <AlertCircle
            size={13}
            className="text-signal-red-text shrink-0 mt-0.5"
          />
          <p className="text-[11px] text-signal-red-text">{error}</p>
        </div>
      )}

      {loading || !isAuthReady || !orgId ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      ) : bundles.length === 0 ? (
        <p className="text-[12px] text-ink-muted text-center py-4">
          No bundles yet. Click <strong>New Bundle</strong> to start.
        </p>
      ) : (
        <div className="space-y-2">
          {bundles.map((bundle) => (
            <BundleRow
              key={bundle.id}
              bundle={bundle}
              expanded={expandedId === bundle.id}
              onToggle={() =>
                setExpandedId(expandedId === bundle.id ? null : bundle.id)
              }
              onReload={reload}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BundleRow({
  bundle,
  expanded,
  onToggle,
  onReload,
}: {
  bundle: RegulatoryBundle;
  expanded: boolean;
  onToggle: () => void;
  onReload: () => Promise<void>;
}) {
  const country = countryOptions.find((c) => c.code === bundle.countryCode);
  const isDraft = bundle.status === "draft";

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSaveEdit(data: Parameters<typeof updateBundle>[1]) {
    setBusy(true);
    try {
      await updateBundle(bundle.id, data);
      setEditing(false);
      await onReload();
    } catch (err: any) {
      alert(err?.message || "Failed to save changes");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteBundle(bundle.id);
      await onReload();
    } catch (err: any) {
      alert(err?.message || "Failed to delete bundle");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-section/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 hover:bg-hover/40 transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-ink-muted shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-ink-muted shrink-0" />
          )}
          <span className="text-[14px] shrink-0">{country?.flag ?? ""}</span>
          <div className="min-w-0">
            <p className="text-[12px] text-ink font-medium truncate">
              {bundle.name}
            </p>
            <p className="text-[11px] text-ink-muted truncate">
              {bundle.businessName} · {formatRelativeTime(bundle.createdAt)}
              {isDraft && " · draft"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {isDraft && !editing && !confirmDelete && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md text-ink-secondary hover:bg-hover transition-colors"
                title="Edit bundle fields"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                title="Delete bundle"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          <BundleStatusBadge status={bundle.status} />
        </div>
      </div>

      {confirmDelete && (
        <div className="border-t border-border-subtle bg-signal-red/5 px-3 py-3">
          <p className="text-[12px] text-ink mb-2">
            Delete this draft bundle? Uploaded documents will be removed too.
            This can&apos;t be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="px-3 py-1.5 rounded-[20px] bg-signal-red-text text-white text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="border-t border-border-subtle px-3 py-3">
          <BundleCreateForm
            mode="edit"
            initialValues={{
              country: bundle.country,
              countryCode: bundle.countryCode,
              businessName: bundle.businessName,
              businessType: bundle.businessType,
              businessClassification: bundle.businessClassification,
              businessRegistrationNumber: bundle.businessRegistrationNumber,
              businessWebsite: bundle.businessWebsite,
              addressStreet1: bundle.addressStreet1,
              addressStreet2: bundle.addressStreet2,
              addressCity: bundle.addressCity,
              addressSubdivision: bundle.addressSubdivision,
              addressPostalCode: bundle.addressPostalCode,
              representativeFirstName: bundle.representativeFirstName,
              representativeLastName: bundle.representativeLastName,
              representativeEmail: bundle.representativeEmail,
              representativePhone: bundle.representativePhone,
            }}
            onCancel={() => setEditing(false)}
            onCreate={async (data) => {
              // In edit mode, country fields are ignored server-side
              const { country: _c, countryCode: _cc, ...patch } = data;
              await handleSaveEdit(patch);
            }}
          />
        </div>
      )}

      {expanded && !editing && (
        <div className="border-t border-border-subtle px-3 py-3">
          <BundleDocumentsSection bundle={bundle} onReload={onReload} />
        </div>
      )}
    </div>
  );
}

function BundleDocumentsSection({
  bundle,
  onReload,
}: {
  bundle: RegulatoryBundle;
  onReload: () => Promise<void>;
}) {
  const [documents, setDocuments] = useState<BundleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);

  const requiredDocs =
    REQUIRED_DOCS[bundle.countryCode] || REQUIRED_DOCS.DEFAULT;

  useEffect(() => {
    setLoading(true);
    getBundleDocuments(bundle.id)
      .then(setDocuments)
      .catch((err) => console.error("Failed to fetch docs:", err))
      .finally(() => setLoading(false));
  }, [bundle.id]);

  async function handleUploadClick(docType: string) {
    setUploadDocType(docType);
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadDocType) return;
    setUploading(uploadDocType);
    try {
      const uploaded = await uploadBundleDocument(bundle.id, file, uploadDocType);
      setDocuments((prev) => [uploaded, ...prev]);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(null);
      setUploadDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDoc(docId: string) {
    try {
      await deleteBundleDocument(bundle.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete document");
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitBundle(bundle.id);
      await onReload();
    } catch (err: any) {
      setError(err?.message || "Failed to submit bundle");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshBundleStatus(bundle.id);
      await onReload();
    } catch (err: any) {
      setError(err?.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  const uploadedTypes = new Set(documents.map((d) => d.documentType));
  const allRequiredUploaded = requiredDocs.every((d) =>
    uploadedTypes.has(d.type),
  );

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-[11px] text-ink-muted">
        Upload the required documents below, then submit the bundle for Twilio
        review. Drafts are saved automatically.
      </p>

      {loading ? (
        <div className="text-[11px] text-ink-muted">Loading documents…</div>
      ) : (
        <div className="space-y-2">
          {requiredDocs.map((doc) => {
            const uploaded = documents.find((d) => d.documentType === doc.type);
            const isUploading = uploading === doc.type;
            return (
              <div
                key={doc.type}
                className="flex items-center justify-between rounded-[8px] border border-border-subtle bg-surface px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {uploaded ? (
                    <CheckCircle
                      size={14}
                      className="text-signal-green-text shrink-0"
                    />
                  ) : (
                    <FileText size={14} className="text-ink-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink font-medium truncate">
                      {doc.label}
                    </p>
                    {uploaded && (
                      <p className="text-[11px] text-ink-muted truncate">
                        {uploaded.fileName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {uploaded ? (
                    bundle.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(uploaded.id)}
                        className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    )
                  ) : bundle.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => handleUploadClick(doc.type)}
                      disabled={isUploading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-section text-ink-secondary text-[10px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Upload size={11} strokeWidth={2} />
                      )}
                      Upload
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/20 px-3 py-2">
          <AlertCircle
            size={13}
            className="text-signal-red-text shrink-0 mt-0.5"
          />
          <p className="text-[11px] text-signal-red-text">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {bundle.status === "draft" && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allRequiredUploaded || submitting}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-colors",
              allRequiredUploaded && !submitting
                ? "bg-signal-green text-signal-green-text hover:bg-signal-green/80"
                : "bg-section text-ink-faint cursor-not-allowed",
            )}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={11} />
            )}
            {allRequiredUploaded
              ? "Submit for review"
              : `Upload all ${requiredDocs.length} documents to submit`}
          </button>
        )}

        {bundle.status === "pending-review" && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={11}
              className={refreshing ? "animate-spin" : ""}
            />
            Check status
          </button>
        )}

        {bundle.twilioBundleSid && (
          <span className="text-[11px] text-ink-muted font-mono">
            {bundle.twilioBundleSid.slice(0, 14)}…
          </span>
        )}
      </div>
    </div>
  );
}
