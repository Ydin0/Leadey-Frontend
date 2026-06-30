"use client";

import { useEffect, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Loader2, Plus, Trash2, Lock } from "lucide-react";
import { useCustomFields } from "@/lib/hooks/use-custom-fields";
import { saveCustomFields } from "@/lib/api/custom-fields";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldType,
} from "@/lib/types/custom-field";
import { TagInput } from "@/components/shared/tag-input";

type DraftField = {
  key?: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
};

const EMPTY_DRAFT: DraftField = {
  label: "",
  fieldType: "text",
  options: [],
  isRequired: false,
};

/** Built-in fields that make up a lead profile (lead + its company + the
 *  company's contacts). These always exist and can't be edited or removed —
 *  custom fields are layered on top. Grouped to mirror the lead profile. */
const DEFAULT_FIELD_GROUPS: { group: string; fields: { label: string; type: string }[] }[] = [
  {
    group: "Lead",
    fields: [
      { label: "Name", type: "Text" },
      { label: "Title", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "LinkedIn URL", type: "Link" },
      { label: "Lead Status", type: "Status" },
      { label: "Lead Source", type: "Text" },
      { label: "Score", type: "Number" },
      { label: "Do Not Call", type: "Toggle" },
      { label: "Next Action", type: "Text" },
      { label: "Next Date", type: "Date" },
      { label: "Campaign Step", type: "Number" },
    ],
  },
  {
    group: "Company",
    fields: [
      { label: "Company Name", type: "Text" },
      { label: "Domain", type: "Text" },
      { label: "Website", type: "Link" },
      { label: "Industry", type: "Text" },
      { label: "Employees", type: "Number" },
      { label: "Location", type: "Text" },
      { label: "Annual Revenue", type: "Text" },
      { label: "Company LinkedIn", type: "Link" },
      { label: "Description", type: "Text" },
      { label: "Hiring Roles", type: "List" },
    ],
  },
  {
    group: "Contact",
    fields: [
      { label: "Contact Name", type: "Text" },
      { label: "Title", type: "Text" },
      { label: "Email", type: "Email" },
      { label: "Phone", type: "Phone" },
      { label: "LinkedIn URL", type: "Link" },
      { label: "Primary Contact", type: "Toggle" },
    ],
  },
];

const DEFAULT_FIELD_COUNT = DEFAULT_FIELD_GROUPS.reduce((s, g) => s + g.fields.length, 0);

export function CustomFieldsSection() {
  const { fields, loading, reload } = useCustomFields();

  const [draft, setDraft] = useState<DraftField[]>([]);
  const [adding, setAdding] = useState<DraftField>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the editable list from the loaded definitions.
  useEffect(() => {
    setDraft(
      fields.map((f) => ({
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        options: f.options,
        isRequired: f.isRequired,
      })),
    );
  }, [fields]);

  function addField() {
    const label = adding.label.trim();
    if (!label) return;
    setDraft((prev) => [...prev, { ...adding, label }]);
    setAdding(EMPTY_DRAFT);
    setSaved(false);
  }

  function removeField(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function updateField(index: number, patch: Partial<DraftField>) {
    setDraft((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveCustomFields(
        draft.map((f) => ({
          key: f.key,
          label: f.label,
          fieldType: f.fieldType,
          options: f.fieldType === "select" ? f.options : [],
          isRequired: f.isRequired,
        })),
      );
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save custom fields");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default fields (read-only) */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[14px] font-semibold text-ink">Default Fields</h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            {DEFAULT_FIELD_COUNT} built-in · {draft.length} custom
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">
          The full lead profile — the lead, its company, and the company&apos;s
          contacts. These can&apos;t be edited or removed. Add your own below.
        </p>
        <div className="space-y-4">
          {DEFAULT_FIELD_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider text-ink-faint font-medium mb-2">
                {grp.group}
              </div>
              <div className="flex flex-wrap gap-2">
                {grp.fields.map((f) => (
                  <span
                    key={grp.group + f.label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary"
                  >
                    {f.label}
                    <span className="text-[9px] uppercase tracking-wide text-ink-faint">
                      {f.type}
                    </span>
                    <Lock size={9} className="text-ink-faint" />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields (editable) */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[14px] font-semibold text-ink">Custom Fields</h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
            {draft.length} field{draft.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">
          Define org-specific fields for leads. They appear on the lead detail
          view and can be mapped from inbound campaign webhooks.
        </p>

        {draft.length === 0 ? (
          <p className="text-[11px] text-ink-muted mb-4">
            No custom fields yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {draft.map((f, i) => (
              <div
                key={i}
                className="rounded-[8px] bg-section/40 border border-border-subtle p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Field name…"
                    className="flex-1 px-2 py-1.5 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                  />
                  <NativeSelect
                    value={f.fieldType}
                    onChange={(e) =>
                      updateField(i, { fieldType: e.target.value as CustomFieldType })
                    }
                    className="px-2 py-1.5 rounded-[6px] bg-surface border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
                  >
                    {CUSTOM_FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </NativeSelect>
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={f.isRequired}
                      onChange={(e) => updateField(i, { isRequired: e.target.checked })}
                      className="accent-signal-blue-text"
                    />
                    Required
                  </label>
                  <button
                    onClick={() => removeField(i)}
                    className="p-1.5 rounded-md text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 transition-colors"
                    title="Remove field"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {f.fieldType === "select" && (
                  <TagInput
                    tags={f.options}
                    onChange={(options) => updateField(i, { options })}
                    placeholder="Add an option and press Enter…"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
          <input
            value={adding.label}
            onChange={(e) => setAdding((p) => ({ ...p, label: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") addField();
            }}
            placeholder="New field name…"
            className="flex-1 px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
          <NativeSelect
            value={adding.fieldType}
            onChange={(e) =>
              setAdding((p) => ({ ...p, fieldType: e.target.value as CustomFieldType }))
            }
            className="px-2 py-1.5 rounded-[6px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default"
          >
            {CUSTOM_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
          <button
            onClick={addField}
            disabled={!adding.label.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        {/* Save bar */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save changes
          </button>
          {error && <span className="text-[11px] text-signal-red-text">{error}</span>}
          {saved && (
            <span className="text-[11px] text-signal-green-text">Custom fields saved.</span>
          )}
        </div>
      </div>
    </div>
  );
}
