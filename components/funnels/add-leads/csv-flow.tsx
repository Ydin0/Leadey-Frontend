"use client";

import { useCallback, useRef, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import {
  AlertCircle, Check, FileSpreadsheet, Loader2, Upload, ArrowLeft, ArrowRight,
  Users, Building2, Globe, Linkedin, Tag, X as XIcon, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  importCsvLeads, type CsvColumnMapping, type CsvGroupBy, type ImportCsvResult,
} from "@/lib/api/funnels";
import { useCustomFields } from "@/lib/hooks/use-custom-fields";

// ── Field vocabulary (grouped, Close-style) ──────────────────────────────
const LEAD_FIELDS = ["Lead Name", "Lead First Name", "Lead Last Name", "Lead Email", "Lead Title", "Lead Phone", "Lead LinkedIn"] as const;
const COMPANY_FIELDS = ["Company Name", "Company Domain", "Company LinkedIn", "Company Industry", "Company Location", "Company Size", "Company Description", "Company Annual Revenue", "Company Hiring Roles"] as const;
const OTHER_FIELDS = ["Notes", "--- Skip ---"] as const;
const ALL_FIELDS = [...LEAD_FIELDS, ...COMPANY_FIELDS, ...OTHER_FIELDS];
/** A standard field label, or a custom field as `custom:<key>`. */
type MappedField = string;
const REQUIRED: MappedField[] = ["Lead Name", "Company Name"];

/** Fields that may map from more than one CSV column. Everything else is a
 *  single-value field and must map from at most ONE column (no duplicates).
 *  Notes aggregates multiple columns; Skip is the absence of a mapping. */
const MULTI_USE: ReadonlySet<MappedField> = new Set<MappedField>(["Notes", "--- Skip ---"]);
const isUniqueField = (f: MappedField) => !MULTI_USE.has(f);

interface ColumnMapping {
  csvColumn: string;
  mappedField: MappedField;
  autoMapped: boolean;
  sample: string;
}

const GROUP_OPTS: { value: CsvGroupBy; label: string; icon: typeof Globe; hint: string; recommended?: boolean }[] = [
  { value: "domain", label: "Company Domain", icon: Globe, hint: "Most reliable — groups leads at the same company by domain.", recommended: true },
  { value: "name", label: "Company Name", icon: Building2, hint: "Group by the company name text." },
  { value: "linkedin", label: "Company LinkedIn", icon: Linkedin, hint: "Group by the company LinkedIn URL." },
];

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/^﻿/, "");
  const matrix: string[][] = [];
  let current = "", inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') { current += '"'; i += 1; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === "," && !inQuotes) { row.push(current); current = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && normalized[i + 1] === "\n") i += 1;
      row.push(current); matrix.push(row); row = []; current = ""; continue;
    }
    current += char;
  }
  if (current.length > 0 || row.length > 0) { row.push(current); matrix.push(row); }
  if (matrix.length === 0) throw new Error("The CSV file is empty");
  const headers = matrix[0].map((h) => h.trim()).filter(Boolean);
  if (headers.length === 0) throw new Error("Could not detect CSV headers");
  const rows = matrix.slice(1)
    .map((line) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => { entry[header] = (line[index] || "").trim(); });
      return entry;
    })
    .filter((entry) => headers.some((h) => entry[h] && entry[h].length > 0));
  return { headers, rows };
}

const normH = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function autoMapField(header: string): MappedField {
  const n = normH(header);
  if (n.includes("company") && n.includes("linkedin")) return "Company LinkedIn";
  if (n.includes("company") && (n.includes("domain") || n.includes("website") || n.includes("url"))) return "Company Domain";
  if (n.includes("domain") || n === "website" || n === "url" || n === "companyurl") return "Company Domain";
  if (n.includes("industry") || n.includes("sector") || n.includes("vertical")) return "Company Industry";
  if (n.includes("employees") || n.includes("companysize") || n.includes("headcount") || n.includes("staffcount")) return "Company Size";
  if (n.includes("location") || n.includes("city") || n.includes("country") || n.includes("region") || n.includes("headquarters") || n === "hq") return "Company Location";
  if (n.includes("hiring") || n.includes("openroles") || n.includes("openpositions") || n.includes("jobtitles") || n.includes("rolesopen") || (n.includes("roles") && n.includes("company"))) return "Company Hiring Roles";
  if (n.includes("revenue") || n.includes("arr") || n.includes("turnover")) return "Company Annual Revenue";
  if ((n.includes("company") && n.includes("description")) || n === "description" || n === "about" || n === "companyabout" || n === "companybio") return "Company Description";
  if (n === "companyname" || n === "company" || n === "account" || n === "accountname" || n === "organization" || n === "organisation") return "Company Name";
  if (n.includes("email")) return "Lead Email";
  if (n.includes("linkedin") || n.includes("profileurl")) return "Lead LinkedIn";
  if (n.includes("title") || n.includes("role") || n.includes("position") || n.includes("jobtitle")) return "Lead Title";
  if (n.includes("phone") || n.includes("mobile") || n.includes("telephone")) return "Lead Phone";
  // First/last must be checked BEFORE the generic "name" match below.
  if (n === "firstname" || n === "fname" || n === "givenname" || (n.includes("first") && n.includes("name"))) return "Lead First Name";
  if (n === "lastname" || n === "lname" || n === "surname" || n === "familyname" || (n.includes("last") && n.includes("name"))) return "Lead Last Name";
  if (n.includes("name") || n.includes("contact")) return "Lead Name";
  if (n.includes("company")) return "Company Name";
  return "--- Skip ---";
}

type Step = "upload" | "map" | "review" | "done";

export function CSVFlow({ funnelId, onDone, onImported }: {
  funnelId: string; onDone: () => void; onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { fields: customFields } = useCustomFields();
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [groupBy, setGroupBy] = useState<CsvGroupBy>("domain");
  const [review, setReview] = useState<ImportCsvResult | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importingRef = useRef(false);
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  const ingestFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = parseCsvText(text);
        if (parsed.rows.length === 0) throw new Error("No lead rows found in this CSV file");
        // Auto-map each column, but never assign the same single-value field
        // twice — the first column to claim it wins, later matches fall back to
        // "Skip" so the user starts with a clean, duplicate-free mapping.
        const claimed = new Set<MappedField>();
        const mapped: ColumnMapping[] = parsed.headers.map((header) => {
          let mappedField = autoMapField(header);
          if (isUniqueField(mappedField)) {
            if (claimed.has(mappedField)) mappedField = "--- Skip ---";
            else claimed.add(mappedField);
          }
          return { csvColumn: header, mappedField, autoMapped: mappedField !== "--- Skip ---", sample: parsed.rows[0]?.[header] || "" };
        });
        setFileName(file.name);
        setCsvRows(parsed.rows);
        setMappings(mapped);
        setStep("map");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not parse CSV file");
      }
    };
    reader.onerror = () => setError("Unable to read the selected file");
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") { setError("Please drop a .csv file"); return; }
      ingestFile(file);
    }
  }

  const mappingPayload = (): CsvColumnMapping[] =>
    mappings.map((m) => ({ csvColumn: m.csvColumn, mappedField: m.mappedField, autoMapped: m.autoMapped }));

  // Send only the columns that are actually mapped (and only non-empty values).
  // Skipped columns are dead weight — trimming them keeps large imports (5k+
  // rows) well under the request-body limit.
  const payloadRows = (): Record<string, string>[] => {
    const cols = mappings.filter((m) => m.mappedField !== "--- Skip ---").map((m) => m.csvColumn);
    return csvRows.map((r) => {
      const o: Record<string, string> = {};
      for (const c of cols) {
        const v = r[c];
        if (v) o[c] = v;
      }
      return o;
    });
  };

  const mappedSet = new Set(mappings.map((m) => m.mappedField));
  // A mapped "Lead First Name" satisfies the name requirement — the backend
  // composes the full name from first + last when no full-name column is mapped.
  const hasNameSource = mappedSet.has("Lead Name") || mappedSet.has("Lead First Name");
  const missingRequired = REQUIRED.filter(
    (f) => !mappedSet.has(f) && !(f === "Lead Name" && hasNameSource),
  );
  const canProceed = missingRequired.length === 0;

  const loadReview = useCallback(async (gb: CsvGroupBy) => {
    setLoadingReview(true);
    setError(null);
    try {
      const r = await importCsvLeads(funnelId, { fileName, mappings: mappingPayload(), rows: payloadRows(), groupBy: gb, dryRun: true });
      setReview(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not preview import");
    } finally {
      setLoadingReview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelId, fileName, csvRows, mappings]);

  function goReview() {
    if (!canProceed) return;
    setStep("review");
    void loadReview(groupBy);
  }
  function changeGroupBy(gb: CsvGroupBy) {
    setGroupBy(gb);
    void loadReview(gb);
  }

  async function runImport() {
    // Synchronous re-entrancy guard — `isImporting` state lags a render, so a
    // rapid double-click could otherwise fire the import twice. The backend
    // also locks per-funnel + de-dupes, so duplicates can't be created even if
    // a second request slips through (retry, refresh, two tabs).
    if (isImporting || importingRef.current) return;
    importingRef.current = true;
    setError(null);
    setIsImporting(true);
    try {
      const r = await importCsvLeads(funnelId, { fileName, mappings: mappingPayload(), rows: payloadRows(), groupBy });
      setResult(r);
      setStep("done");
      onImported?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import CSV");
    } finally {
      setIsImporting(false);
      importingRef.current = false;
    }
  }

  // ── Step: upload ───────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-1">Import leads from CSV</h3>
        <p className="text-[11px] text-ink-muted mb-4">Drag a file in or browse — you&apos;ll map columns next.</p>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-[14px] p-12 text-center cursor-pointer transition-colors",
            dragOver ? "border-accent bg-accent/5" : "border-border-default hover:border-accent/60 hover:bg-hover/40",
          )}
        >
          <Upload size={28} strokeWidth={1.5} className={cn("mx-auto mb-3", dragOver ? "text-accent" : "text-ink-faint")} />
          <p className="text-[13px] font-medium text-ink mb-1">{dragOver ? "Drop to upload" : "Drop your CSV here, or click to browse"}</p>
          <p className="text-[11px] text-ink-muted">.csv files up to 10,000 rows</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) ingestFile(f); e.target.value = ""; }} />
        {error && <ErrorBox error={error} />}
      </div>
    );
  }

  // ── Step: map ──────────────────────────────────────────────────────────
  if (step === "map") {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-1">Map your columns</h3>
        <p className="text-[11px] text-ink-muted mb-3">
          <FileSpreadsheet size={12} className="inline mr-1" />
          {fileName} · {csvRows.length.toLocaleString()} rows · map each column to any lead, company{customFields.length > 0 ? ", or custom" : ""} field.
        </p>

        <div className="bg-surface rounded-[14px] border border-border-subtle mb-3">
          <table className="w-full table-fixed">
            <thead className="bg-section/95">
              <tr className="border-b border-border-subtle">
                <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium px-3 py-2 w-[32%]">CSV column</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium px-3 py-2 w-[30%]">Sample</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium px-3 py-2 w-[38%]">Maps to</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, index) => (
                <tr key={m.csvColumn} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 text-[12px] font-medium text-ink truncate" title={m.csvColumn}>{m.csvColumn}</td>
                  <td className="px-3 py-2 text-[11px] text-ink-muted truncate" title={m.sample}>{m.sample || <span className="text-ink-faint">—</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FieldKind field={m.mappedField} />
                      <NativeSelect
                        value={m.mappedField}
                        onChange={(e) => {
                          const next = e.target.value as MappedField;
                          setMappings((prev) => prev.map((x, i) => {
                            if (i === index) return { ...x, mappedField: next, autoMapped: false };
                            // A single-value field can only live on one column —
                            // moving it here clears whichever column held it.
                            if (isUniqueField(next) && x.mappedField === next) {
                              return { ...x, mappedField: "--- Skip ---" as MappedField, autoMapped: false };
                            }
                            return x;
                          }));
                        }}
                        className="flex-1 min-w-0 text-[11px] text-ink bg-section border border-border-subtle rounded-lg px-2 py-1.5 focus:outline-none focus:border-border-default"
                      >
                        <optgroup label="Lead">{LEAD_FIELDS.map((o) => <option key={o} value={o}>{o.replace("Lead ", "")}{REQUIRED.includes(o) ? " *" : ""}</option>)}</optgroup>
                        <optgroup label="Company">{COMPANY_FIELDS.map((o) => <option key={o} value={o}>{o.replace("Company ", "")}{REQUIRED.includes(o) ? " *" : ""}</option>)}</optgroup>
                        {customFields.length > 0 && (
                          <optgroup label="Custom fields">
                            {customFields.map((f) => <option key={f.key} value={`custom:${f.key}`}>{f.label}</option>)}
                          </optgroup>
                        )}
                        <optgroup label="Other">{OTHER_FIELDS.map((o) => <option key={o} value={o}>{o === "--- Skip ---" ? "Skip column" : o}</option>)}</optgroup>
                      </NativeSelect>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {missingRequired.length > 0 && (
          <div className="mb-3 rounded-[10px] border border-signal-blue-text/25 bg-signal-blue/10 px-3 py-2 flex items-center gap-2">
            <AlertCircle size={13} className="text-signal-blue-text" />
            <p className="text-[11px] text-signal-blue-text">Map a column to {missingRequired.join(" and ")} to continue.</p>
          </div>
        )}
        {error && <ErrorBox error={error} />}

        <div className="flex items-center justify-between">
          <button onClick={() => setStep("upload")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <button onClick={goReview} disabled={!canProceed}
            className="flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40">
            Next: grouping &amp; review <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step: review ───────────────────────────────────────────────────────
  if (step === "review") {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-1">Group &amp; review</h3>
        <p className="text-[11px] text-ink-muted mb-3">Choose how leads are grouped into companies, then review what will be imported.</p>

        {/* Grouping key */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {GROUP_OPTS.map((opt) => {
            const Ico = opt.icon;
            const on = groupBy === opt.value;
            return (
              <button key={opt.value} onClick={() => changeGroupBy(opt.value)}
                className={cn("text-left p-3 rounded-[12px] border transition-colors", on ? "border-accent bg-accent/5" : "border-border-subtle bg-surface hover:bg-hover/40")}>
                <div className="flex items-center justify-between mb-1">
                  <Ico size={15} className={on ? "text-accent" : "text-ink-muted"} />
                  {opt.recommended && <span className="text-[8px] uppercase tracking-wide font-semibold text-signal-green-text bg-signal-green/15 rounded-full px-1.5 py-0.5">Recommended</span>}
                </div>
                <div className="text-[12px] font-medium text-ink">{opt.label}</div>
                <div className="text-[10px] text-ink-muted leading-snug mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>

        {/* Review stats */}
        <div className="bg-surface rounded-[14px] border border-border-subtle p-4 mb-3">
          {loadingReview || !review ? (
            <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Users} tone="text-signal-green-text" label="Leads to import" value={review.importedRows} />
                <Stat icon={Building2} tone="text-signal-blue-text" label="Companies" value={review.companiesTotal} sub={`${review.existingCompanies} existing · ${review.newCompanies} new`} />
              </div>
              <div className="border-t border-border-subtle pt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-ink-muted"><CheckCircle2 size={12} className="text-signal-green-text" />{review.totalRows.toLocaleString()} rows read</span>
                {review.duplicateLeads > 0 && <span className="flex items-center gap-1.5 text-ink-muted"><AlertCircle size={12} className="text-signal-blue-text" />{review.duplicateLeads} duplicate{review.duplicateLeads === 1 ? "" : "s"} skipped</span>}
                {review.invalidRows > 0 && <span className="flex items-center gap-1.5 text-ink-muted"><AlertTriangle size={12} className="text-signal-red-text" />{review.invalidRows} invalid skipped</span>}
                {review.existingCompanies > 0 && <span className="flex items-center gap-1.5 text-ink-muted"><Building2 size={12} className="text-ink-faint" />Leads nest under {review.existingCompanies} existing compan{review.existingCompanies === 1 ? "y" : "ies"}</span>}
              </div>
            </div>
          )}
        </div>
        {error && <ErrorBox error={error} />}

        <div className="flex items-center justify-between">
          <button onClick={() => setStep("map")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <button onClick={() => void runImport()} disabled={isImporting || loadingReview || !review || review.importedRows === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40">
            {isImporting ? <><Loader2 size={12} className="animate-spin" /> Importing…</> : `Import ${(review?.importedRows ?? 0).toLocaleString()} lead${review?.importedRows === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: done ─────────────────────────────────────────────────────────
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-signal-green flex items-center justify-center mx-auto mb-4">
        <Check size={22} strokeWidth={2} className="text-signal-green-text" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">Import complete</h3>
      <p className="text-[12px] text-ink-muted mb-3">
        Added <span className="font-semibold text-ink">{result?.importedRows ?? 0}</span> lead{result?.importedRows === 1 ? "" : "s"} across {result?.companiesTotal ?? 0} compan{result?.companiesTotal === 1 ? "y" : "ies"} from {fileName}.
      </p>
      <div className="inline-flex flex-col gap-1 text-[11px] text-ink-muted mb-5">
        {!!result?.existingCompanies && <span>{result.existingCompanies} matched an existing company</span>}
        {!!result?.duplicateLeads && <span>{result.duplicateLeads} duplicate{result.duplicateLeads === 1 ? "" : "s"} skipped</span>}
        {!!result?.invalidRows && <span>{result.invalidRows} invalid row{result.invalidRows === 1 ? "" : "s"} skipped</span>}
      </div>
      <div>
        <button onClick={onDone} className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors">Done</button>
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="my-3 rounded-[10px] border border-signal-red-text/25 bg-signal-red/10 px-3 py-2 flex items-start gap-2">
      <AlertCircle size={14} className="text-signal-red-text mt-0.5 shrink-0" />
      <p className="text-[11px] text-signal-red-text">{error}</p>
    </div>
  );
}

function FieldKind({ field }: { field: MappedField }) {
  if (field.startsWith("custom:")) return <Tag size={12} className="text-signal-slate-text shrink-0" />;
  if ((LEAD_FIELDS as readonly string[]).includes(field)) return <Users size={12} className="text-signal-green-text shrink-0" />;
  if ((COMPANY_FIELDS as readonly string[]).includes(field)) return <Building2 size={12} className="text-signal-blue-text shrink-0" />;
  if (field === "Notes") return <FileSpreadsheet size={12} className="text-ink-muted shrink-0" />;
  return <XIcon size={12} className="text-ink-faint shrink-0" />;
}

function Stat({ icon: Icon, tone, label, value, sub }: { icon: typeof Users; tone: string; label: string; value: number; sub?: string }) {
  return (
    <div className="bg-section/40 rounded-[10px] border border-border-subtle p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={tone} />
        <span className="text-[10px] text-ink-muted">{label}</span>
      </div>
      <p className="text-[18px] font-semibold text-ink leading-none">{value.toLocaleString()}</p>
      {sub && <p className="text-[10px] text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}
