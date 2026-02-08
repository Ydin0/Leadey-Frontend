import { EnrichmentJobRow } from "./enrichment-job-row";
import type { EnrichmentJob } from "@/lib/types/pipeline";

export function EnrichmentQueue({ jobs }: { jobs: EnrichmentJob[] }) {
  const processing = jobs.filter((j) => j.status === "processing");

  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-[13px] font-semibold text-ink">Enrichment Pipeline</h3>
        <span className="text-[10px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-1.5 py-0.5">
          {processing.length} processing
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {jobs.map((job) => (
          <EnrichmentJobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
