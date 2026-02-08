"use client";

import { useRef, useState } from "react";
import { AlertCircle, Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  importCsvLeads,
  type CsvColumnMapping,
  type ImportCsvResult,
} from "@/lib/api/funnels";

const FIELD_OPTIONS = [
  "Name",
  "Email",
  "Company",
  "Title",
  "Phone",
  "LinkedIn URL",
  "--- Skip ---",
] as const;

type MappedField = (typeof FIELD_OPTIONS)[number];

interface ColumnMapping {
  csvColumn: string;
  mappedField: MappedField;
  autoMapped: boolean;
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/^\uFEFF/, "");
  const matrix: string[][] = [];

  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (char === '"') {
      const next = normalized[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && normalized[i + 1] === "\n") {
        i += 1;
      }
      row.push(current);
      matrix.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    matrix.push(row);
  }

  if (matrix.length === 0) {
    throw new Error("The CSV file is empty");
  }

  const headers = matrix[0].map((header) => header.trim()).filter(Boolean);
  if (headers.length === 0) {
    throw new Error("Could not detect CSV headers");
  }

  const rows: Record<string, string>[] = matrix
    .slice(1)
    .map((line) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = (line[index] || "").trim();
      });
      return entry;
    })
    .filter((entry) => headers.some((header) => entry[header] && entry[header].length > 0));

  return { headers, rows };
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMapField(header: string): MappedField {
  const normalized = normalizeHeader(header);

  if (/(fullname|firstname|lastname|contactname|name)/.test(normalized)) return "Name";
  if (/(email|workemail)/.test(normalized)) return "Email";
  if (/(company|account|organization|organisation)/.test(normalized)) return "Company";
  if (/(title|jobtitle|role|position)/.test(normalized)) return "Title";
  if (/(phone|mobile|telephone)/.test(normalized)) return "Phone";
  if (/(linkedin|linkedinurl|profileurl)/.test(normalized)) return "LinkedIn URL";

  return "--- Skip ---";
}

export function CSVFlow({
  funnelId,
  onDone,
  onImported,
}: {
  funnelId: string;
  onDone: () => void;
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  function resetError() {
    setError(null);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    resetError();
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = parseCsvText(text);

        if (parsed.rows.length === 0) {
          throw new Error("No lead rows found in this CSV file");
        }

        const mapped = parsed.headers.map((header) => {
          const mappedField = autoMapField(header);
          return {
            csvColumn: header,
            mappedField,
            autoMapped: mappedField !== "--- Skip ---",
          } satisfies ColumnMapping;
        });

        setFileName(file.name);
        setCsvRows(parsed.rows);
        setMappings(mapped);
        setStep(1);
      } catch (parseError) {
        const message =
          parseError instanceof Error ? parseError.message : "Could not parse CSV file";
        setError(message);
      }
    };
    reader.onerror = () => {
      setError("Unable to read the selected file");
    };
    reader.readAsText(file);
  }

  function updateMapping(index: number, mappedField: MappedField) {
    setMappings((prev) =>
      prev.map((mapping, rowIndex) =>
        rowIndex === index ? { ...mapping, mappedField, autoMapped: false } : mapping
      )
    );
  }

  async function runImport() {
    if (isImporting) return;

    resetError();
    setIsImporting(true);

    const payloadMappings: CsvColumnMapping[] = mappings.map((mapping) => ({
      csvColumn: mapping.csvColumn,
      mappedField: mapping.mappedField,
      autoMapped: mapping.autoMapped,
    }));

    try {
      const importResult = await importCsvLeads(funnelId, {
        fileName,
        mappings: payloadMappings,
        rows: csvRows,
      });

      setResult(importResult);
      setStep(2);
      onImported?.();
    } catch (importError) {
      const message =
        importError instanceof Error ? importError.message : "Failed to import CSV";
      setError(message);
    } finally {
      setIsImporting(false);
    }
  }

  const mappedCount = mappings.filter((mapping) => mapping.mappedField !== "--- Skip ---").length;

  if (step === 0) {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-4">Import from CSV</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border-default rounded-[14px] p-12 text-center cursor-pointer hover:border-border-subtle hover:bg-hover/50 transition-colors"
        >
          <Upload size={28} strokeWidth={1.5} className="text-ink-faint mx-auto mb-3" />
          <p className="text-[13px] font-medium text-ink mb-1">Drop CSV here or click to upload</p>
          <p className="text-[11px] text-ink-muted">Supports .csv files up to 10,000 rows</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

        {error && (
          <div className="mt-4 rounded-[10px] border border-signal-red-text/25 bg-signal-red/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle size={14} className="text-signal-red-text mt-0.5" />
            <p className="text-[11px] text-signal-red-text">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-ink mb-1">Map CSV Columns</h3>
        <p className="text-[11px] text-ink-muted mb-4">
          <FileSpreadsheet size={12} className="inline mr-1" />
          {fileName} · {csvRows.length} rows detected
        </p>

        <div className="bg-surface rounded-[14px] border border-border-subtle overflow-hidden mb-4 max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-section/50">
                <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium px-4 py-2">
                  CSV Column
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium px-4 py-2">
                  Mapped To
                </th>
                <th className="text-center text-[10px] uppercase tracking-wider text-ink-muted font-medium px-4 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping, index) => (
                <tr key={mapping.csvColumn} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-2 text-[12px] font-medium text-ink">{mapping.csvColumn}</td>
                  <td className="px-4 py-2">
                    <select
                      value={mapping.mappedField}
                      onChange={(event) => updateMapping(index, event.target.value as MappedField)}
                      className="text-[11px] text-ink bg-section border border-border-subtle rounded-lg px-2 py-1 focus:outline-none"
                    >
                      {FIELD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {mapping.mappedField !== "--- Skip ---" && (
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          mapping.autoMapped
                            ? "bg-signal-green text-signal-green-text"
                            : "bg-signal-blue text-signal-blue-text"
                        )}
                      >
                        {mapping.autoMapped ? "Auto" : "Manual"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mb-4 rounded-[10px] border border-signal-red-text/25 bg-signal-red/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle size={14} className="text-signal-red-text mt-0.5" />
            <p className="text-[11px] text-signal-red-text">{error}</p>
          </div>
        )}

        <button
          onClick={() => void runImport()}
          disabled={mappedCount === 0 || isImporting}
          className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {isImporting ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${csvRows.length.toLocaleString()} Leads`
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-full bg-signal-green flex items-center justify-center mx-auto mb-4">
        <Check size={22} strokeWidth={2} className="text-signal-green-text" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">Import Complete</h3>
      <p className="text-[12px] text-ink-muted mb-2">
        Imported {result?.importedRows ?? 0} of {result?.totalRows ?? 0} rows from {fileName}
      </p>
      {result && result.skippedRows > 0 && (
        <p className="text-[11px] text-ink-muted mb-5">
          {result.skippedRows} rows skipped (duplicates or invalid data)
        </p>
      )}
      <button
        onClick={onDone}
        className="px-5 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
