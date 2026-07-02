"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";

/** One save-target option: a contact's enrollment in one campaign. */
export interface ComposerEnrollment {
  leadId: string;
  funnelId: string;
  funnelName: string;
  contactId: string;
  contactName: string;
  lastActivityAt: string | null;
}

/**
 * The universal profile's note composer. Notes stay campaign-level (they live
 * on one enrollment), so the composer carries a "Save to" selector —
 * pre-selected to the most recently active enrollment, switchable per note.
 */
export function CompanyNoteComposer({
  enrollments,
  defaultLeadId,
  onAdd,
}: {
  enrollments: ComposerEnrollment[];
  defaultLeadId: string | null;
  onAdd: (text: string, enrollment: ComposerEnrollment) => void;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(defaultLeadId);

  // Follow the default when the context changes (e.g. a contact filter).
  useEffect(() => {
    setSelected(defaultLeadId);
  }, [defaultLeadId]);

  const target =
    enrollments.find((e) => e.leadId === selected) ?? enrollments.find((e) => e.leadId === defaultLeadId);
  const disabled = enrollments.length === 0;

  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden mb-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        disabled={disabled}
        placeholder={disabled ? "Add this company to a campaign to write notes…" : "Write a note about this company…"}
        className="w-full bg-transparent px-4 py-3 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none resize-none disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border-subtle">
        <button
          onClick={() => {
            if (text.trim() && target) {
              onAdd(text.trim(), target);
              setText("");
            }
          }}
          disabled={!text.trim() || !target}
          className="px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors shrink-0"
        >
          Add note
        </button>
        {disabled ? (
          <span className="text-[11px] text-ink-faint">Notes save to a campaign enrollment</span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-faint min-w-0">
            <Check size={12} className="text-signal-green-text shrink-0" />
            <span className="shrink-0">Save to</span>
            <NativeSelect
              value={target?.leadId ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="text-[11px] max-w-[240px]"
            >
              {enrollments.map((e) => (
                <option key={e.leadId} value={e.leadId}>
                  {e.contactName} · {e.funnelName}
                </option>
              ))}
            </NativeSelect>
          </span>
        )}
      </div>
    </div>
  );
}
