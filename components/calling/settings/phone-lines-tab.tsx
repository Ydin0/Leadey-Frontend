"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { getPhoneLines } from "@/lib/api/phone-lines";
import { PhoneLineFilters, type PhoneLineFilterState } from "./phone-line-filters";
import { PhoneLinesTable } from "./phone-lines-table";
import { PhoneLineDetail } from "./phone-line-detail";
import { BundleManagement } from "./bundle-management";
import { ProvisionWizardShell } from "@/components/calling/provision/provision-wizard-shell";
import type { PhoneLine } from "@/lib/types/calling";

type PhoneLinesView = "list" | "provision" | "detail";

export function PhoneLinesTab() {
  const [view, setView] = useState<PhoneLinesView>("list");
  const [selectedLine, setSelectedLine] = useState<PhoneLine | null>(null);
  const [lines, setLines] = useState<PhoneLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PhoneLineFilterState>({
    status: "all",
    country: "all",
    assignment: "all",
  });

  const fetchLines = useCallback(async () => {
    try {
      const data = await getPhoneLines();
      setLines(data);
    } catch (err) {
      console.error("Failed to fetch phone lines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  function handleSelectLine(line: PhoneLine) {
    setSelectedLine(line);
    setView("detail");
  }

  function handleBackToList() {
    setView("list");
    setSelectedLine(null);
    fetchLines();
  }

  if (view === "provision") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBackToList}
          className="flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink-secondary transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to Phone Lines
        </button>
        <ProvisionWizardShell onComplete={handleBackToList} />
      </div>
    );
  }

  if (view === "detail" && selectedLine) {
    return <PhoneLineDetail line={selectedLine} onBack={handleBackToList} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Phone Lines</h2>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Manage phone numbers, assignments, and provisioning.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView("provision")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Provision New Number
        </button>
      </div>

      {/* Filters */}
      <PhoneLineFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      ) : (
        <PhoneLinesTable
          lines={lines}
          filters={filters}
          onSelectLine={handleSelectLine}
          onProvision={() => setView("provision")}
        />
      )}

      {/* Bundle Management */}
      <BundleManagement />
    </div>
  );
}
