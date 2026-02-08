import { ScraperActiveRow } from "./scraper-active-row";
import type { ScraperAssignment, ScraperDefinition } from "@/lib/types/scraper";
import { estimateScraperDailyUsage } from "@/lib/scraper-estimation";

interface ScraperActiveListProps {
  assignments: ScraperAssignment[];
  catalog: ScraperDefinition[];
  onUpdateAssignment: (assignment: ScraperAssignment) => void;
}

export function ScraperActiveList({
  assignments,
  catalog,
  onUpdateAssignment,
}: ScraperActiveListProps) {
  const enabled = assignments.filter((a) => a.enabled);
  const disabled = assignments.filter((a) => !a.enabled);
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const categoryTotals = new Map<
    string,
    { creditsPerDay: number; signalsPerDay: number; count: number }
  >();

  enabled.forEach((assignment) => {
    const definition = catalogById.get(assignment.scraperId);
    const category = definition?.category ?? "social";
    const estimate = estimateScraperDailyUsage(assignment, category);
    const current = categoryTotals.get(category) ?? {
      creditsPerDay: 0,
      signalsPerDay: 0,
      count: 0,
    };
    categoryTotals.set(category, {
      creditsPerDay: current.creditsPerDay + estimate.creditsPerDay,
      signalsPerDay: current.signalsPerDay + estimate.signalsPerDay,
      count: current.count + 1,
    });
  });

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Active Scrapers</h3>
      {categoryTotals.size > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Daily Credit Forecast By Category
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {Array.from(categoryTotals.entries()).map(([category, totals]) => (
              <div
                key={category}
                className="rounded-[12px] border border-border-subtle bg-surface px-3 py-2"
              >
                <p className="text-[10px] text-ink-faint capitalize">{category}</p>
                <p className="text-[12px] font-medium text-ink mt-1">
                  ~{Math.round(totals.creditsPerDay)} credits/day
                </p>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  ~{Math.round(totals.signalsPerDay)} signals/day · {totals.count} scraper
                  {totals.count > 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {enabled.map((a) => (
          <ScraperActiveRow
            key={a.id}
            assignment={a}
            definition={catalogById.get(a.scraperId)}
            onSaveConfig={onUpdateAssignment}
          />
        ))}
      </div>
      {disabled.length > 0 && (
        <>
          <h4 className="text-[11px] text-ink-muted mt-4 mb-2">Paused ({disabled.length})</h4>
          <div className="space-y-2 opacity-60">
            {disabled.map((a) => (
              <ScraperActiveRow
                key={a.id}
                assignment={a}
                definition={catalogById.get(a.scraperId)}
                onSaveConfig={onUpdateAssignment}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
