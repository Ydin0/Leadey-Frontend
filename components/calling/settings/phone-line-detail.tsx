"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { updatePhoneLine } from "@/lib/api/phone-lines";
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleAssign(memberId: string | null, memberName: string | null) {
    setAssignedTo(memberId);
    setAssignedToName(memberName);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await updatePhoneLine(line.id, {
        assignedTo,
        assignedToName,
        voicemailGreeting: config.voicemailGreeting,
        callForwardingNumber: config.callForwardingNumber,
        callRecordingEnabled: config.callRecordingEnabled,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
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
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} strokeWidth={2} />
          ) : null}
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-signal-red-text">{error}</p>
      )}

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
        <LineConfigForm config={config} onChange={(c) => { setConfig(c); setSaved(false); }} />
      </section>
    </div>
  );
}
