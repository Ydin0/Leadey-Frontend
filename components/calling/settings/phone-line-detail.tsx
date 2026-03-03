"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { PhoneLine } from "@/lib/types/calling";
import { PhoneLineStatusBadge } from "@/components/calling/shared/phone-line-status-badge";
import { LineAssignmentSelect } from "./line-assignment-select";
import { LineConfigForm } from "./line-config-form";
import { LineUsageStats } from "./line-usage-stats";

interface PhoneLineDetailProps {
  line: PhoneLine;
  onBack: () => void;
}

export function PhoneLineDetail({ line, onBack }: PhoneLineDetailProps) {
  const [config, setConfig] = useState(line.config);
  const [assignedTo, setAssignedTo] = useState(line.assignedTo);
  const [assignedToName, setAssignedToName] = useState(line.assignedToName);

  function handleAssign(memberId: string | null, memberName: string | null) {
    setAssignedTo(memberId);
    setAssignedToName(memberName);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} className="text-ink-muted" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink">{line.friendlyName}</h3>
            <PhoneLineStatusBadge status={line.status} />
          </div>
          <p className="text-[12px] text-ink-muted">{line.number}</p>
        </div>
      </div>

      {/* Usage Stats */}
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h4 className="text-[13px] font-semibold text-ink mb-3">Usage This Month</h4>
        <LineUsageStats stats={line.stats} />
      </section>

      {/* Assignment */}
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h4 className="text-[13px] font-semibold text-ink mb-3">Assignment</h4>
        <LineAssignmentSelect
          currentAssignedTo={assignedTo}
          currentAssignedToName={assignedToName}
          onAssign={handleAssign}
        />
      </section>

      {/* Configuration */}
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <h4 className="text-[13px] font-semibold text-ink mb-3">Configuration</h4>
        <LineConfigForm config={config} onChange={setConfig} />
      </section>
    </div>
  );
}
