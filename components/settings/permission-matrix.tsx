"use client";

import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PERMISSION_CATALOG,
  type PermissionModule,
  type PermValue,
  type ResolvedPermissions,
} from "@/lib/types/permissions";

const MODULE_LABELS: Record<PermissionModule, string> = {
  campaigns: "Campaigns",
  leads: "Leads",
  opportunities: "Opportunities",
  tasks: "Tasks",
  inbox: "Inbox",
  messaging: "Messaging",
  calling: "Calling",
  scrapers: "Scrapers",
  templates: "Templates",
  knowledgeBase: "Knowledge Base",
  analytics: "Analytics",
  settings: "Settings & Admin",
};

/** Human labels for scope options + boolean keys (fallbacks derive from the key). */
const SCOPE_LABELS: Record<string, string> = {
  all: "Everything", assigned: "Assigned to them", campaigns: "Their campaigns",
  none: "Nothing", own: "Only their own",
};
function humanize(key: string): string {
  const label = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  const map: Record<string, string> = {
    Create: "Create", Edit: "Edit", Delete: "Delete", "Add Leads": "Add leads",
    "Manage Workflows": "Manage workflows", Export: "Export", Enrich: "Enrich",
    "Assign Owner": "Assign owner", "Edit All": "Edit anyone's", "Manage Pipelines": "Manage pipelines",
    "Assign Others": "Assign to others", "Edit Others": "Edit others' tasks",
    "Send Sms": "Send SMS", "Send Whatsapp": "Send WhatsApp", "Send Email": "Send email",
    "Manage Accounts": "Manage accounts", "Place Calls": "Place calls", "Use Dialer": "Use dialer",
    "Provision Numbers": "Provision numbers", View: "View", Run: "Run", Manage: "Manage", Use: "Use",
    "Manage Billing": "Manage billing", "Manage Team": "Manage team & permissions",
    "Manage Phone Lines": "Manage phone lines", "Manage Integrations": "Manage integrations",
    "Manage Org Config": "Manage org config (statuses, tags, fields…)", "Manage Api Keys": "Manage API keys",
  };
  return map[label] ?? label;
}

/**
 * The full grouped permission editor. `values` is the effective resolved map
 * being edited; `onChange(key, value)` reports one change at a time. When
 * `baseline` is given, keys that differ from it show a "Custom" chip (used by
 * the per-member override editor). `disabled` renders it read-only (built-in
 * role preview).
 */
export function PermissionMatrix({
  values,
  onChange,
  baseline,
  disabled,
}: {
  values: ResolvedPermissions;
  onChange?: (key: string, value: PermValue) => void;
  baseline?: ResolvedPermissions;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(PERMISSION_CATALOG) as PermissionModule[]).map((mod) => {
        const spec = PERMISSION_CATALOG[mod];
        return (
          <div key={mod} className="rounded-[12px] border border-border-subtle bg-section/30 p-3">
            <h4 className="text-[12px] font-semibold text-ink mb-2.5">{MODULE_LABELS[mod]}</h4>
            <div className="flex flex-col gap-1.5">
              {/* Scope rows (enumerated view axes) */}
              {Object.entries(spec.scopes).map(([scope, opts]) => {
                const key = `${mod}.${scope}`;
                const val = String(values[key] ?? opts[opts.length - 1]);
                const overridden = baseline && baseline[key] !== undefined && baseline[key] !== values[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-ink-secondary flex items-center gap-1.5">
                      {scope === "view" ? "Can see" : scope === "access" ? "Access" : scope === "recordings" ? "Recordings" : humanize(scope)}
                      {overridden && <CustomChip />}
                    </span>
                    <NativeSelect
                      value={val}
                      disabled={disabled}
                      onChange={(e) => onChange?.(key, e.target.value)}
                      className="w-[190px] px-2.5 py-1.5 rounded-[8px] bg-surface border border-border-subtle text-[11.5px] text-ink disabled:opacity-60"
                    >
                      {opts.map((o: string) => (
                        <option key={o} value={o}>{SCOPE_LABELS[o] ?? o}</option>
                      ))}
                    </NativeSelect>
                  </div>
                );
              })}
              {/* Boolean capability toggles */}
              {spec.booleans.map((b) => {
                const key = `${mod}.${b}`;
                const on = values[key] === true;
                const overridden = baseline && baseline[key] !== undefined && baseline[key] !== values[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-ink-secondary flex items-center gap-1.5">
                      {humanize(b)}
                      {overridden && <CustomChip />}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => onChange?.(key, !on)}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60",
                        on ? "bg-accent" : "bg-border-default",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface transition-transform",
                          on && "translate-x-4",
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustomChip() {
  return (
    <span className="text-[9px] font-medium rounded-full px-1.5 py-px bg-signal-amber/15 text-signal-amber-text uppercase tracking-wide">
      Custom
    </span>
  );
}
