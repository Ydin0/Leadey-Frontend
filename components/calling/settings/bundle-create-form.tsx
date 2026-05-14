"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { countryOptions } from "@/lib/constants/calling";

const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "corporation", label: "Corporation" },
  { value: "nonprofit", label: "Non-Profit" },
];

const BUSINESS_CLASSIFICATIONS = [
  { value: "INDEPENDENT_SOFTWARE_VENDOR", label: "Independent Software Vendor" },
  { value: "RESELLER", label: "Reseller" },
  { value: "ENTERPRISE", label: "Enterprise" },
  { value: "CONSULTING_AGENCY", label: "Consulting / Agency" },
];

const REGISTRATION_NUMBER_HINT_BY_COUNTRY: Record<string, string> = {
  GB: "Companies House registration number",
  US: "EIN (Employer Identification Number)",
  AU: "ABN (Australian Business Number)",
  CA: "Business Number",
  DE: "Handelsregister (HRB) number",
  FR: "SIREN number",
  IE: "CRO (Companies Registration Office) number",
  IN: "CIN (Corporate Identity Number)",
  SG: "UEN (Unique Entity Number)",
  AE: "Trade Licence / TRN",
};

export interface BundleCreateData {
  country: string;
  countryCode: string;
  businessName: string;
  businessType: string;
  businessClassification: string;
  businessRegistrationNumber: string;
  businessWebsite: string;
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressSubdivision: string;
  addressPostalCode: string;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  representativePhone: string;
}

interface BundleCreateFormProps {
  onCancel: () => void;
  onCreate: (data: BundleCreateData) => Promise<void> | void;
  /** When set, the form is in edit mode: country is read-only and the
   *  submit button is labelled "Save changes". */
  initialValues?: Partial<BundleCreateData>;
  mode?: "create" | "edit";
}

const inputClass =
  "w-full px-3 py-2 rounded-[8px] bg-surface text-[12px] text-ink outline-none border border-border-subtle placeholder:text-ink-faint focus:border-border-default";

const labelClass =
  "block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1";

const sectionTitleClass =
  "text-[11px] uppercase tracking-wider text-ink-muted font-medium";

export function BundleCreateForm({
  onCancel,
  onCreate,
  initialValues,
  mode = "create",
}: BundleCreateFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [d, setD] = useState<BundleCreateData>({
    country: initialValues?.country || "",
    countryCode: initialValues?.countryCode || "",
    businessName: initialValues?.businessName || "",
    businessType: initialValues?.businessType || "limited_company",
    businessClassification:
      initialValues?.businessClassification || "INDEPENDENT_SOFTWARE_VENDOR",
    businessRegistrationNumber: initialValues?.businessRegistrationNumber || "",
    businessWebsite: initialValues?.businessWebsite || "",
    addressStreet1: initialValues?.addressStreet1 || "",
    addressStreet2: initialValues?.addressStreet2 || "",
    addressCity: initialValues?.addressCity || "",
    addressSubdivision: initialValues?.addressSubdivision || "",
    addressPostalCode: initialValues?.addressPostalCode || "",
    representativeFirstName: initialValues?.representativeFirstName || "",
    representativeLastName: initialValues?.representativeLastName || "",
    representativeEmail: initialValues?.representativeEmail || "",
    representativePhone: initialValues?.representativePhone || "",
  });
  const isEdit = mode === "edit";

  function set<K extends keyof BundleCreateData>(k: K, v: BundleCreateData[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  const canSubmit =
    d.countryCode &&
    d.businessName.trim() &&
    d.businessRegistrationNumber.trim() &&
    d.addressStreet1.trim() &&
    d.addressCity.trim() &&
    d.addressPostalCode.trim() &&
    d.representativeFirstName.trim() &&
    d.representativeLastName.trim() &&
    d.representativeEmail.trim() &&
    d.representativePhone.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreate(d);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-section/50 p-4 space-y-5">
      {/* Country */}
      <div>
        <label className={labelClass}>Country *</label>
        {isEdit ? (
          <div className="px-3 py-2 rounded-[10px] bg-surface text-[12px] text-ink-muted border border-border-subtle">
            {countryOptions.find((c) => c.code === d.countryCode)?.flag}{" "}
            {d.country} — cannot change after creation
          </div>
        ) : (
          <NativeSelect
            value={d.countryCode}
            onChange={(e) => {
              const opt = countryOptions.find((c) => c.code === e.target.value);
              setD((prev) => ({
                ...prev,
                countryCode: opt?.code ?? "",
                country: opt?.name ?? "",
              }));
            }}
          >
            <option value="">Select country…</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      {/* Business */}
      <div className="space-y-3">
        <h4 className={sectionTitleClass}>Business</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Legal Business Name *</label>
            <input
              type="text"
              value={d.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Acme Ltd"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Business Type</label>
            <NativeSelect
              value={d.businessType}
              onChange={(e) => set("businessType", e.target.value)}
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className={labelClass}>Classification</label>
            <NativeSelect
              value={d.businessClassification}
              onChange={(e) => set("businessClassification", e.target.value)}
            >
              {BUSINESS_CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>
              {REGISTRATION_NUMBER_HINT_BY_COUNTRY[d.countryCode] ||
                "Business Registration Number"}{" "}
              *
            </label>
            <input
              type="text"
              value={d.businessRegistrationNumber}
              onChange={(e) =>
                set("businessRegistrationNumber", e.target.value)
              }
              placeholder="Registration number"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Business Website</label>
            <input
              type="url"
              value={d.businessWebsite}
              onChange={(e) => set("businessWebsite", e.target.value)}
              placeholder="https://www.example.com"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h4 className={sectionTitleClass}>Registered Address</h4>
        <div>
          <label className={labelClass}>Street Line 1 *</label>
          <input
            type="text"
            value={d.addressStreet1}
            onChange={(e) => set("addressStreet1", e.target.value)}
            placeholder="123 Main Street"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Street Line 2</label>
          <input
            type="text"
            value={d.addressStreet2}
            onChange={(e) => set("addressStreet2", e.target.value)}
            placeholder="Apt, suite, unit (optional)"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>City *</label>
            <input
              type="text"
              value={d.addressCity}
              onChange={(e) => set("addressCity", e.target.value)}
              placeholder="City"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State / Region</label>
            <input
              type="text"
              value={d.addressSubdivision}
              onChange={(e) => set("addressSubdivision", e.target.value)}
              placeholder="State or county"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Postal Code *</label>
            <input
              type="text"
              value={d.addressPostalCode}
              onChange={(e) => set("addressPostalCode", e.target.value)}
              placeholder="Postal code"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Authorized Representative */}
      <div className="space-y-3">
        <h4 className={sectionTitleClass}>Authorized Representative</h4>
        <p className="text-[11px] text-ink-muted -mt-1">
          The person Twilio can contact about this business — typically a
          director or officer.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First Name *</label>
            <input
              type="text"
              value={d.representativeFirstName}
              onChange={(e) => set("representativeFirstName", e.target.value)}
              placeholder="First name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              type="text"
              value={d.representativeLastName}
              onChange={(e) => set("representativeLastName", e.target.value)}
              placeholder="Last name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Work Email *</label>
            <input
              type="email"
              value={d.representativeEmail}
              onChange={(e) => set("representativeEmail", e.target.value)}
              placeholder="name@company.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input
              type="tel"
              value={d.representativePhone}
              onChange={(e) => set("representativePhone", e.target.value)}
              placeholder="+44 20 1234 5678"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? isEdit ? "Saving…" : "Saving draft…"
            : isEdit ? "Save changes" : "Save as draft"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          Cancel
        </button>
        {!isEdit && (
          <span className="text-[11px] text-ink-muted ml-2">
            You&apos;ll upload documents and submit for review after saving.
          </span>
        )}
      </div>
    </div>
  );
}
