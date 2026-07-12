"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { MemberMultiSelect } from "@/components/shared/member-multi-select";
import { MultiSelectPills } from "@/components/shared/multi-select-pills";
import { useTeamData } from "@/lib/team/team-data-context";

/** Header control that narrows every analytics/leaderboard view to a chosen set
 *  of reps and/or departments (union). Reads the shared filter from context. */
export function TeamFilterControl() {
  const { activeMembers, departments, filter, setFilter } = useTeamData();
  const [open, setOpen] = useState(false);
  const count = filter.repIds.length + filter.departments.length;
  const memberOptions = activeMembers.map((m) => ({ id: m.id, name: m.name, email: m.email }));

  return (
    <div style={{ position: "relative" }}>
      <button
        className="pill pill-soft row"
        style={{ gap: 6, ...(count ? { color: "var(--accent)", borderColor: "var(--accent)" } : null) }}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="sliders-horizontal" size={12} />
        Filter{count ? ` · ${count}` : ""}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="card"
            style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, zIndex: 50, padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <MultiSelectPills
                label="Departments"
                options={departments.map((d) => d.name)}
                selected={filter.departments}
                onChange={(departments) => setFilter({ ...filter, departments })}
                placeholder="Search departments…"
              />
              <MemberMultiSelect
                label="Reps"
                options={memberOptions}
                selected={filter.repIds}
                onChange={(repIds) => setFilter({ ...filter, repIds })}
                placeholder="Search reps…"
              />
              {count > 0 && (
                <button
                  className="row"
                  style={{ gap: 6, fontSize: 11, color: "var(--fg-muted)", justifyContent: "center" }}
                  onClick={() => setFilter({ repIds: [], departments: [] })}
                >
                  <Icon name="rotate-ccw" size={11} /> Clear filter
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
