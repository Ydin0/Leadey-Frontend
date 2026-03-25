"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SearchBuilderShell } from "@/components/scrapers/search-builder-shell";
import { getScraperAssignments, type ScraperAssignmentRow } from "@/lib/api/scrapers";
import { useAuthReady } from "@/components/providers/auth-token-sync";

export default function EditSearchPage() {
  const params = useParams();
  const id = params.id as string;
  const isAuthReady = useAuthReady();
  const [assignment, setAssignment] = useState<ScraperAssignmentRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    async function load() {
      try {
        const rows = await getScraperAssignments();
        const found = rows.find((r) => r.id === id);
        setAssignment(found || null);
      } catch (err) {
        console.error("Failed to load assignment:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isAuthReady]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-20 text-ink-muted text-[13px]">
        Search not found.
      </div>
    );
  }

  return (
    <SearchBuilderShell
      mode="edit"
      initialData={{
        id: assignment.id,
        searchName: assignment.searchName || assignment.scraperName,
        filters: assignment.filters || {},
        frequency: assignment.frequency,
        enabled: assignment.enabled,
        maxSignalsPerRun: assignment.maxSignalsPerRun,
      }}
    />
  );
}
