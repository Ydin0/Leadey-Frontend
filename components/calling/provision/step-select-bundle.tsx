"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Upload, Trash2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getBundles, createBundle, getBundleDocuments,
  uploadBundleDocument, deleteBundleDocument, submitBundle,
} from "@/lib/api/phone-lines";
import { BundleStatusBadge } from "@/components/calling/settings/bundle-status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import type { CountryOption, RegulatoryBundle, BundleDocument } from "@/lib/types/calling";

interface StepSelectBundleProps {
  country: CountryOption | null;
  selectedBundleId: string | null;
  onSelect: (bundleId: string | null) => void;
  onSkip: () => void;
}

const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "corporation", label: "Corporation" },
  { value: "nonprofit", label: "Non-Profit" },
];

// Twilio business classifications
const BUSINESS_CLASSIFICATIONS = [
  { value: "INDEPENDENT_SOFTWARE_VENDOR", label: "Independent Software Vendor" },
  { value: "RESELLER", label: "Reseller" },
  { value: "ENTERPRISE", label: "Enterprise" },
  { value: "CONSULTING_AGENCY", label: "Consulting / Agency" },
];

// Per-country registration authority defaults
const REGISTRATION_AUTHORITY_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  GB: [
    { value: "UK:CRN", label: "UK:CRN (Companies House Reg #)" },
  ],
  US: [
    { value: "US:EIN", label: "US:EIN (Employer Identification #)" },
    { value: "US:DUNS", label: "US:DUNS" },
  ],
  AU: [
    { value: "AU:ABN", label: "AU:ABN (Australian Business #)" },
    { value: "AU:ACN", label: "AU:ACN (Australian Company #)" },
  ],
  CA: [
    { value: "CA:CBN", label: "CA:CBN (Business #)" },
  ],
  DE: [
    { value: "DE:HRB", label: "DE:HRB (Handelsregister)" },
  ],
  FR: [
    { value: "FR:SIREN", label: "FR:SIREN" },
  ],
  IE: [
    { value: "IE:CRO", label: "IE:CRO (Companies Reg Office)" },
  ],
  IN: [
    { value: "IN:CIN", label: "IN:CIN (Corporate Identity #)" },
  ],
  SG: [
    { value: "SG:UEN", label: "SG:UEN (Unique Entity #)" },
  ],
  AE: [
    { value: "AE:TRN", label: "AE:TRN (Tax Reg #)" },
  ],
  DEFAULT: [
    { value: "OTHER", label: "Other / Country-specific" },
  ],
};

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

export function StepSelectBundle({ country, selectedBundleId, onSelect, onSkip }: StepSelectBundleProps) {
  const [bundles, setBundles] = useState<RegulatoryBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "create" | "documents">("list");

  // Create form state — business info
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("limited_company");
  const [businessRegAuthority, setBusinessRegAuthority] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessClassification, setBusinessClassification] = useState("INDEPENDENT_SOFTWARE_VENDOR");
  // Address
  const [addressStreet1, setAddressStreet1] = useState("");
  const [addressStreet2, setAddressStreet2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressSubdivision, setAddressSubdivision] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  // Authorized rep
  const [repFirstName, setRepFirstName] = useState("");
  const [repLastName, setRepLastName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Document state
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<BundleDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);

  useEffect(() => {
    if (country && !country.bundleRequired) {
      onSkip();
    }
  }, [country, onSkip]);

  useEffect(() => {
    getBundles()
      .then(setBundles)
      .catch((err) => console.error("Failed to fetch bundles:", err))
      .finally(() => setLoading(false));
  }, []);

  const countryBundles = bundles.filter((b) => b.countryCode === country?.code);
  const requiredDocs = REQUIRED_DOCS[country?.code || ""] || REQUIRED_DOCS.DEFAULT;

  async function handleCreate() {
    if (!businessName.trim()) return;
    setCreating(true);
    try {
      const newBundle = await createBundle({
        country: country?.name || "",
        countryCode: country?.code || "",
        businessName,
        businessType,
        businessRegistrationAuthority: businessRegAuthority,
        businessRegistrationNumber: businessRegNumber,
        businessWebsite,
        businessClassification,
        addressStreet1,
        addressStreet2,
        addressCity,
        addressSubdivision,
        addressPostalCode,
        representativeFirstName: repFirstName,
        representativeLastName: repLastName,
        representativeEmail: repEmail,
        representativePhone: repPhone,
      });
      setBundles((prev) => [newBundle, ...prev]);
      setActiveBundleId(newBundle.id);
      onSelect(newBundle.id);
      setMode("documents");
    } catch (err) {
      console.error("Failed to create bundle:", err);
    } finally {
      setCreating(false);
    }
  }

  async function loadDocuments(bundleId: string) {
    try {
      const docs = await getBundleDocuments(bundleId);
      setDocuments(docs);
    } catch {}
  }

  async function handleFileSelect(docType: string) {
    setUploadDocType(docType);
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeBundleId || !uploadDocType) return;

    setUploading(uploadDocType);
    setUploadError(null);
    try {
      const doc = await uploadBundleDocument(activeBundleId, file, uploadDocType);
      setDocuments((prev) => [...prev, doc]);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(null);
      setUploadDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!activeBundleId) return;
    try {
      await deleteBundleDocument(activeBundleId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleSubmitBundle() {
    if (!activeBundleId) return;
    setSubmitting(true);
    try {
      const result = await submitBundle(activeBundleId);
      setBundles((prev) => prev.map((b) => b.id === activeBundleId ? { ...b, status: result.status as any, twilioBundleSid: result.twilioBundleSid } : b));
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function selectExistingBundle(bundleId: string) {
    onSelect(bundleId);
    setActiveBundleId(bundleId);
    setMode("documents");
    loadDocuments(bundleId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  const activeBundle = bundles.find((b) => b.id === activeBundleId);
  const allRequiredUploaded = requiredDocs.every((rd) =>
    documents.some((d) => d.documentType === rd.type)
  );

  // ── Document Upload View ──
  if (mode === "documents" && activeBundleId) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Upload Documents</h3>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Upload the required compliance documents for {country?.name}. Twilio will review them before approving your bundle.
          </p>
        </div>

        {activeBundle && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-section/50 border border-border-subtle">
            <FileText size={14} className="text-ink-muted" />
            <span className="text-[12px] font-medium text-ink">{activeBundle.businessName}</span>
            <BundleStatusBadge status={activeBundle.status} />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          className="hidden"
        />

        {uploadError && (
          <div className="px-3 py-2 rounded-[8px] bg-signal-red/10 border border-signal-red-text/10 text-[11px] text-signal-red-text">
            {uploadError}
          </div>
        )}

        <div className="space-y-2">
          {requiredDocs.map((rd) => {
            const uploaded = documents.find((d) => d.documentType === rd.type);
            const isUploading = uploading === rd.type;

            return (
              <div key={rd.type} className="flex items-center justify-between px-4 py-3 rounded-[10px] border border-border-subtle bg-surface">
                <div className="flex items-center gap-2.5">
                  {uploaded ? (
                    <CheckCircle size={16} className="text-signal-green-text shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-ink-faint shrink-0" />
                  )}
                  <div>
                    <p className="text-[12px] font-medium text-ink">{rd.label}</p>
                    {uploaded && (
                      <p className="text-[10px] text-ink-muted">{uploaded.fileName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {uploaded ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(uploaded.id)}
                      className="p-1.5 rounded-md text-ink-muted hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFileSelect(rd.type)}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium bg-ink text-on-ink hover:bg-ink/90 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      Upload
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {activeBundle?.status === "draft" && (
          <button
            type="button"
            onClick={handleSubmitBundle}
            disabled={!allRequiredUploaded || submitting}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[20px] text-[11px] font-medium transition-colors",
              allRequiredUploaded && !submitting
                ? "bg-signal-green text-signal-green-text hover:bg-signal-green/80"
                : "bg-section text-ink-faint cursor-not-allowed"
            )}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {allRequiredUploaded ? "Submit for Review" : `Upload all ${requiredDocs.length} documents to submit`}
          </button>
        )}

        {activeBundle?.status === "pending-review" && (
          <div className="px-4 py-3 rounded-[10px] bg-signal-blue/10 border border-signal-blue-text/10">
            <p className="text-[12px] font-medium text-signal-blue-text">Bundle submitted for review</p>
            <p className="text-[11px] text-ink-muted mt-0.5">Twilio typically reviews within 1-3 business days. You can proceed with number selection — the number will activate once the bundle is approved.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setMode("list"); setActiveBundleId(null); onSelect(null); }}
          className="text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          Back to bundle list
        </button>
      </div>
    );
  }

  // ── Create Bundle View ──
  if (mode === "create") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Create Regulatory Bundle</h3>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Provide your business details for {country?.name} compliance.
          </p>
        </div>

        <div className="space-y-5">
          {/* ── Business ────────────────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
              Business
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Business Name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="OCTOGLE TECHNOLOGIES LTD"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Business Type</label>
                <NativeSelect value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Classification</label>
                <NativeSelect value={businessClassification} onChange={(e) => setBusinessClassification(e.target.value)}>
                  {BUSINESS_CLASSIFICATIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Registration Authority *</label>
                <NativeSelect value={businessRegAuthority} onChange={(e) => setBusinessRegAuthority(e.target.value)}>
                  <option value="">Select…</option>
                  {(REGISTRATION_AUTHORITY_BY_COUNTRY[country?.code || ""] || REGISTRATION_AUTHORITY_BY_COUNTRY.DEFAULT).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Registration Number *</label>
                <input type="text" value={businessRegNumber} onChange={(e) => setBusinessRegNumber(e.target.value)}
                  placeholder="14516092"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Business Website</label>
                <input type="url" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)}
                  placeholder="https://www.octogle.com"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
            </div>
          </div>

          {/* ── Registered Address ─────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
              Registered Address
            </h4>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Street Line 1 *</label>
              <input type="text" value={addressStreet1} onChange={(e) => setAddressStreet1(e.target.value)}
                placeholder="319B Walton Road"
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Street Line 2</label>
              <input type="text" value={addressStreet2} onChange={(e) => setAddressStreet2(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">City *</label>
                <input type="text" value={addressCity} onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Molesey"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">State / Region</label>
                <input type="text" value={addressSubdivision} onChange={(e) => setAddressSubdivision(e.target.value)}
                  placeholder="England"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Postal Code *</label>
                <input type="text" value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder="KT8 2QG"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
            </div>
          </div>

          {/* ── Authorized Representative ───────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
              Authorized Representative
            </h4>
            <p className="text-[11px] text-ink-muted -mt-1">
              The person Twilio can contact about this business — typically a director or officer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">First Name *</label>
                <input type="text" value={repFirstName} onChange={(e) => setRepFirstName(e.target.value)}
                  placeholder="Yaseen"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Last Name *</label>
                <input type="text" value={repLastName} onChange={(e) => setRepLastName(e.target.value)}
                  placeholder="Chaudhry"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Work Email *</label>
                <input type="email" value={repEmail} onChange={(e) => setRepEmail(e.target.value)}
                  placeholder="yaseen@octogle.com"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1 block">Phone *</label>
                <input type="tel" value={repPhone} onChange={(e) => setRepPhone(e.target.value)}
                  placeholder="+447502241019"
                  className="w-full px-3 py-2 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="button" onClick={() => setMode("list")}
            className="px-4 py-2 rounded-[20px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleCreate} disabled={!businessName.trim() || creating}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[11px] font-medium transition-colors",
              businessName.trim() && !creating ? "bg-ink text-on-ink hover:bg-ink/90" : "bg-section text-ink-faint cursor-not-allowed"
            )}>
            {creating && <Loader2 size={11} className="animate-spin" />}
            Create & Upload Documents
          </button>
        </div>
      </div>
    );
  }

  // ── Bundle List View ──
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">Regulatory Bundle</h3>
        <p className="text-[12px] text-ink-muted mt-0.5">
          {country?.name} requires a regulatory bundle with business verification documents.
        </p>
      </div>

      {countryBundles.length > 0 && (
        <div className="space-y-2">
          {countryBundles.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              onClick={() => selectExistingBundle(bundle.id)}
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

      <button
        type="button"
        onClick={() => setMode("create")}
        className={cn(
          "w-full px-4 py-3 rounded-[10px] border border-dashed text-center transition-colors",
          countryBundles.length === 0
            ? "border-ink bg-section/50 text-ink text-[12px] font-medium"
            : "border-border-default hover:bg-hover/30 text-[11px] text-ink-muted"
        )}
      >
        {countryBundles.length === 0 ? "Create Your First Bundle" : "Create a new bundle"}
      </button>
    </div>
  );
}
