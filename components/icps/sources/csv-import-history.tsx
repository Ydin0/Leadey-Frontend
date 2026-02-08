import { CSVImportRow } from "./csv-import-row";
import type { CSVImport } from "@/lib/types/pipeline";

export function CSVImportHistory({ imports }: { imports: CSVImport[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Import History</h3>
      <div className="space-y-2">
        {imports.map((imp) => (
          <CSVImportRow key={imp.id} imp={imp} />
        ))}
        {imports.length === 0 && (
          <p className="text-[12px] text-ink-muted text-center py-4">No imports yet</p>
        )}
      </div>
    </div>
  );
}
