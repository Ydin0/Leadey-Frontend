"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OrgChartPreview as OrgChartPreviewType } from "@/lib/types/company";

interface OrgChartPreviewProps {
  chart: OrgChartPreviewType;
  onEnrichMatching: () => void;
  onCustomize: () => void;
  onSkip: () => void;
}

export function OrgChartPreview({ chart, onEnrichMatching, onCustomize, onSkip }: OrgChartPreviewProps) {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{chart.companyName}</h3>
          <p className="text-[11px] text-ink-muted">{chart.totalEmployees.toLocaleString()} employees</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left py-2 pr-4 text-ink-muted font-medium">Department</th>
              <th className="text-right py-2 px-2 text-ink-muted font-medium">Total</th>
              <th className="text-right py-2 px-2 text-ink-muted font-medium">C-Level</th>
              <th className="text-right py-2 px-2 text-ink-muted font-medium">VP</th>
              <th className="text-right py-2 px-2 text-ink-muted font-medium">Dir</th>
              <th className="text-right py-2 px-2 text-ink-muted font-medium">Mgr</th>
            </tr>
          </thead>
          <tbody>
            {chart.departmentBreakdown.map((dept) => (
              <tr
                key={dept.department}
                className={cn(
                  "border-b border-border-subtle",
                  dept.matchesPersona ? "bg-signal-blue/30" : "opacity-50"
                )}
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1.5">
                    {dept.matchesPersona && (
                      <span className="text-signal-blue-text text-[10px]">&#10003;</span>
                    )}
                    <span className={cn("font-medium", dept.matchesPersona ? "text-ink" : "text-ink-muted")}>{dept.department}</span>
                  </div>
                </td>
                <td className="text-right py-2 px-2 text-ink-secondary">{dept.total.toLocaleString()}</td>
                <td className="text-right py-2 px-2 text-ink-secondary">{dept.cLevel}</td>
                <td className="text-right py-2 px-2 text-ink-secondary">{dept.vp}</td>
                <td className="text-right py-2 px-2 text-ink-secondary">{dept.director}</td>
                <td className="text-right py-2 px-2 text-ink-secondary">{dept.manager}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <p className="text-[11px] text-ink-secondary">
          Matching your personas: <span className="font-medium text-signal-blue-text">~{chart.matchingCount} people</span>
        </p>
        <p className="text-[10px] text-ink-muted mt-0.5">
          Estimated cost: {chart.estimatedCost} credits
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onEnrichMatching}
          className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
        >
          Enrich Matching
        </button>
        <button
          onClick={onCustomize}
          className="px-4 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors"
        >
          Customize
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-1.5 rounded-[20px] text-ink-muted text-[11px] font-medium hover:text-ink-secondary transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
