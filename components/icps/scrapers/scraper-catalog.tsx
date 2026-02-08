"use client";

import { ScraperCatalogCard } from "./scraper-catalog-card";
import type { ScraperDefinition } from "@/lib/types/scraper";

interface ScraperCatalogProps {
  scrapers: ScraperDefinition[];
  activeScraperIds?: string[];
  onAdd: (scraper: ScraperDefinition) => void;
}

export function ScraperCatalog({ scrapers, activeScraperIds = [], onAdd }: ScraperCatalogProps) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Scraper Catalog</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {scrapers.map((scraper) => (
          <ScraperCatalogCard
            key={scraper.id}
            scraper={scraper}
            onAdd={onAdd}
            isAdded={activeScraperIds.includes(scraper.id)}
          />
        ))}
      </div>
    </div>
  );
}
