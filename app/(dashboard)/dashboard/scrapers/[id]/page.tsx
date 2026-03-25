"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SearchDetailShell } from "@/components/scrapers/search-detail-shell";

export default function SearchDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      }
    >
      <SearchDetailShell searchId={id} />
    </Suspense>
  );
}
