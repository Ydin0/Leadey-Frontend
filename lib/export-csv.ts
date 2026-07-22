function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export interface CSVColumn {
  key: string;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateCSV(rows: any[], columns: CSVColumn[]): string {
  const header = columns.map((c) => escapeCSV(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCSV(String(row[col.key] ?? ""))).join(","),
  );
  return [header, ...lines].join("\r\n");
}

export function downloadCSV(csvContent: string, filename: string) {
  // Prepend a UTF-8 BOM so Excel reads accents/emoji correctly — idempotent, so
  // server-generated CSV that already carries a BOM isn't double-prefixed.
  const withBom = csvContent.charCodeAt(0) === 0xfeff ? csvContent : "﻿" + csvContent;
  const blob = new Blob([withBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
