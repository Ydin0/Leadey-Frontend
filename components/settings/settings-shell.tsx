"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  PlugZap,
  Save,
  Shield,
  Users,
  UserCircle2,
  UserPlus,
  X,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { mockSettings } from "@/lib/mock-data/settings";
import type {
  AppSettingsSnapshot,
  IntegrationSettings,
  TeamMemberSettings,
  TeamRole,
} from "@/lib/types/settings";

type SettingsTab =
  | "profile"
  | "organization"
  | "team"
  | "billing"
  | "notifications"
  | "integrations";

const tabs: { id: SettingsTab; label: string; icon: typeof UserCircle2 }[] = [
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: PlugZap },
];

const roleOptions: TeamRole[] = ["admin", "manager", "rep", "viewer"];

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "number";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      />
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2">
      <div>
        <p className="text-[12px] text-ink font-medium">{label}</p>
        <p className="text-[11px] text-ink-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-10 h-5 rounded-full p-0.5 transition-colors",
          checked ? "bg-signal-blue-text" : "bg-border-default"
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-surface transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function roleBadge(role: TeamRole) {
  if (role === "admin") return "bg-signal-red text-signal-red-text";
  if (role === "manager") return "bg-signal-blue text-signal-blue-text";
  if (role === "rep") return "bg-signal-green text-signal-green-text";
  return "bg-signal-slate text-signal-slate-text";
}

function nextTeamId(members: TeamMemberSettings[]) {
  const max = members.reduce((acc, member) => {
    const numeric = Number(member.id.replace("tm_", ""));
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc;
  }, 0);
  return `tm_${String(max + 1).padStart(3, "0")}`;
}

function cycleLabel(cycle: "monthly" | "annual") {
  return cycle === "monthly" ? "Month" : "Year";
}

function TeamStatusBadge({ status }: { status: TeamMemberSettings["status"] }) {
  const className =
    status === "active"
      ? "bg-signal-green text-signal-green-text"
      : status === "invited"
        ? "bg-signal-blue text-signal-blue-text"
        : "bg-signal-red text-signal-red-text";
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", className)}>
      {status}
    </span>
  );
}

function InvoiceStatusBadge({
  status,
}: {
  status: "paid" | "due" | "failed";
}) {
  const className =
    status === "paid"
      ? "bg-signal-green text-signal-green-text"
      : status === "due"
        ? "bg-signal-blue text-signal-blue-text"
        : "bg-signal-red text-signal-red-text";
  return (
    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", className)}>
      {status}
    </span>
  );
}

function IntegrationBadge({ integration }: { integration: IntegrationSettings }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium rounded-full px-2 py-0.5",
        integration.connected
          ? "bg-signal-green text-signal-green-text"
          : "bg-signal-slate text-signal-slate-text"
      )}
    >
      {integration.connected ? "Connected" : "Disconnected"}
    </span>
  );
}

export function SettingsShell() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [draft, setDraft] = useState<AppSettingsSnapshot>(mockSettings);
  const [savedState, setSavedState] = useState<AppSettingsSnapshot>(mockSettings);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("rep");

  const seatsUsed = draft.teamMembers.filter(
    (member) => member.status === "active" || member.status === "invited"
  ).length;
  const seatLimit = 10;
  const creditUsagePct = Math.min(
    100,
    Math.round((draft.billing.creditsUsedThisMonth / draft.billing.creditsIncludedMonthly) * 100)
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedState),
    [draft, savedState]
  );

  function handleSaveAll() {
    setSavedState(draft);
  }

  function handleDiscard() {
    setDraft(savedState);
  }

  function inviteMember() {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) return;
    setDraft((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        {
          id: nextTeamId(prev.teamMembers),
          name: email.split("@")[0],
          email,
          role: inviteRole,
          status: "invited",
          lastActive: null,
        },
      ],
    }));
    setInviteEmail("");
    setInviteRole("rep");
  }

  function updateTeamMemberRole(memberId: string, role: TeamRole) {
    setDraft((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member) =>
        member.id === memberId ? { ...member, role } : member
      ),
    }));
  }

  function removeTeamMember(memberId: string) {
    setDraft((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((member) => member.id !== memberId),
    }));
  }

  function toggleIntegration(integrationId: string) {
    setDraft((prev) => ({
      ...prev,
      integrations: prev.integrations.map((integration) =>
        integration.id !== integrationId
          ? integration
          : {
              ...integration,
              connected: !integration.connected,
              connectedAccount: integration.connected
                ? null
                : integration.connectedAccount || "configured",
            }
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Settings</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Manage profile, organization, team, billing, and platform controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[10px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-2 py-0.5">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={13} strokeWidth={2} />
            Discard
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={13} strokeWidth={2} />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-3">
          <div className="bg-surface rounded-[14px] border border-border-subtle p-2 space-y-1 sticky top-20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-left transition-colors",
                    activeTab === tab.id
                      ? "bg-ink text-on-ink"
                      : "text-ink-secondary hover:bg-hover"
                  )}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  <span className="text-[12px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="col-span-9 space-y-4">
          {activeTab === "profile" && (
            <SettingCard
              title="Profile Settings"
              description="Your personal account details and security controls."
            >
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Full Name"
                  value={draft.profile.fullName}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, fullName: value },
                    }))
                  }
                />
                <InputField
                  label="Title"
                  value={draft.profile.title}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, title: value },
                    }))
                  }
                />
                <InputField
                  label="Email"
                  type="email"
                  value={draft.profile.email}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, email: value },
                    }))
                  }
                />
                <InputField
                  label="Phone"
                  value={draft.profile.phone}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, phone: value },
                    }))
                  }
                />
                <InputField
                  label="Timezone"
                  value={draft.profile.timezone}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, timezone: value },
                    }))
                  }
                />
                <InputField
                  label="Locale"
                  value={draft.profile.locale}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, locale: value },
                    }))
                  }
                />
              </div>

              <div className="mt-4 space-y-2">
                <ToggleField
                  label="Two-factor authentication"
                  description="Require a second factor when signing in."
                  checked={draft.profile.twoFactorEnabled}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        twoFactorEnabled: !prev.profile.twoFactorEnabled,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Strict session timeout"
                  description={`Auto-sign out after ${draft.profile.sessionTimeoutMinutes} minutes.`}
                  checked={draft.profile.sessionTimeoutMinutes <= 60}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        sessionTimeoutMinutes:
                          prev.profile.sessionTimeoutMinutes <= 60 ? 240 : 60,
                      },
                    }))
                  }
                />
              </div>
            </SettingCard>
          )}

          {activeTab === "organization" && (
            <SettingCard
              title="Organization Settings"
              description="Workspace identity, defaults, and access policy."
            >
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Organization Name"
                  value={draft.organization.organizationName}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: { ...prev.organization, organizationName: value },
                    }))
                  }
                />
                <InputField
                  label="Primary Domain"
                  value={draft.organization.primaryDomain}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: { ...prev.organization, primaryDomain: value },
                    }))
                  }
                />
                <InputField
                  label="Website"
                  type="url"
                  value={draft.organization.website}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: { ...prev.organization, website: value },
                    }))
                  }
                />
                <InputField
                  label="Billing Email"
                  type="email"
                  value={draft.organization.billingEmail}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: { ...prev.organization, billingEmail: value },
                    }))
                  }
                />
                <InputField
                  label="Timezone"
                  value={draft.organization.timezone}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: { ...prev.organization, timezone: value },
                    }))
                  }
                />
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
                    Default Currency
                  </label>
                  <select
                    value={draft.organization.defaultCurrency}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        organization: {
                          ...prev.organization,
                          defaultCurrency: e.target.value as "USD" | "EUR" | "GBP",
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <ToggleField
                  label="Require SSO for all members"
                  description="Force team login through your identity provider."
                  checked={draft.organization.ssoRequired}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: {
                        ...prev.organization,
                        ssoRequired: !prev.organization.ssoRequired,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="IP allowlist"
                  description="Restrict workspace access to approved network ranges."
                  checked={draft.organization.ipAllowlistEnabled}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      organization: {
                        ...prev.organization,
                        ipAllowlistEnabled: !prev.organization.ipAllowlistEnabled,
                      },
                    }))
                  }
                />
              </div>
            </SettingCard>
          )}

          {activeTab === "team" && (
            <>
              <SettingCard
                title="Seat Usage"
                description={`${seatsUsed} / ${seatLimit} seats used`}
              >
                <div className="h-2 rounded bg-section">
                  <div
                    className="h-2 rounded bg-signal-blue-text"
                    style={{ width: `${Math.min(100, Math.round((seatsUsed / seatLimit) * 100))}%` }}
                  />
                </div>
              </SettingCard>

              <SettingCard
                title="Invite Team Member"
                description="Invite teammates and assign default access role."
              >
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <InputField
                      label="Work Email"
                      type="email"
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      placeholder="name@company.com"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                      className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={inviteMember}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-[10px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
                    >
                      <UserPlus size={13} strokeWidth={2} />
                      Invite
                    </button>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title="Team Members"
                description="Manage roles and member status."
              >
                <div className="space-y-2">
                  {draft.teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-12 gap-2 items-center rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="text-[12px] font-medium text-ink truncate">{member.name}</p>
                        <p className="text-[11px] text-ink-muted truncate">{member.email}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", roleBadge(member.role))}>
                          {member.role}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <TeamStatusBadge status={member.status} />
                      </div>
                      <div className="col-span-2 text-[11px] text-ink-muted">
                        {member.lastActive ? formatRelativeTime(member.lastActive) : "Never active"}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => updateTeamMemberRole(member.id, e.target.value as TeamRole)}
                          className="px-2 py-1 rounded-[8px] bg-surface text-[11px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(member.id)}
                          className="px-2 py-1 rounded-[8px] text-[11px] text-ink-muted hover:text-signal-red-text hover:bg-signal-red transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingCard>
            </>
          )}

          {activeTab === "billing" && (
            <>
              <SettingCard
                title="Billing Plan"
                description="Current subscription and credit limits."
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] border border-border-subtle bg-section/50 px-3 py-3">
                    <p className="text-[10px] text-ink-faint uppercase tracking-wider">Current Plan</p>
                    <p className="text-[14px] font-semibold text-ink mt-1">{draft.billing.planName}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      ${draft.billing.monthlyPriceUsd} / {cycleLabel(draft.billing.billingCycle)}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-border-subtle bg-section/50 px-3 py-3">
                    <p className="text-[10px] text-ink-faint uppercase tracking-wider">Payment Method</p>
                    <p className="text-[14px] font-semibold text-ink mt-1">{draft.billing.paymentMethodLabel}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Next invoice {draft.billing.nextInvoiceDate.toLocaleDateString("en-US")}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] text-ink-secondary">Credit usage this month</p>
                    <p className="text-[11px] text-ink-muted">
                      {draft.billing.creditsUsedThisMonth.toLocaleString()} / {draft.billing.creditsIncludedMonthly.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-2 rounded bg-section">
                    <div
                      className="h-2 rounded bg-signal-blue-text"
                      style={{ width: `${creditUsagePct}%` }}
                    />
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title="Auto Top-Up"
                description="Automatically purchase credits when balance drops."
              >
                <div className="space-y-2">
                  <ToggleField
                    label="Enable auto top-up"
                    description="Prevents campaign interruptions when credits run low."
                    checked={draft.billing.autoTopUpEnabled}
                    onToggle={() =>
                      setDraft((prev) => ({
                        ...prev,
                        billing: {
                          ...prev.billing,
                          autoTopUpEnabled: !prev.billing.autoTopUpEnabled,
                        },
                      }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Top-up Threshold"
                      type="number"
                      value={String(draft.billing.autoTopUpThreshold)}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          billing: {
                            ...prev.billing,
                            autoTopUpThreshold: Number(value) || 0,
                          },
                        }))
                      }
                    />
                    <InputField
                      label="Top-up Amount"
                      type="number"
                      value={String(draft.billing.autoTopUpAmount)}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          billing: {
                            ...prev.billing,
                            autoTopUpAmount: Number(value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title="Invoices"
                description="Recent billing history."
              >
                <div className="space-y-2">
                  {draft.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-[12px] text-ink font-medium">{invoice.periodLabel}</p>
                        <p className="text-[11px] text-ink-muted">{invoice.id} · {invoice.issuedAt.toLocaleDateString("en-US")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-medium text-ink">${invoice.totalUsd}</span>
                        <InvoiceStatusBadge status={invoice.status} />
                        <button className="text-[11px] text-ink-muted hover:text-ink transition-colors">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingCard>
            </>
          )}

          {activeTab === "notifications" && (
            <SettingCard
              title="Notification Preferences"
              description="Choose where critical platform alerts are sent."
            >
              <div className="space-y-2">
                <ToggleField
                  label="Critical alerts via email"
                  description="Scraper failures, integration breakages, and API errors."
                  checked={draft.notifications.criticalAlertsEmail}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        criticalAlertsEmail: !prev.notifications.criticalAlertsEmail,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Weekly digest email"
                  description="Summary of pipeline, signals, and team output."
                  checked={draft.notifications.weeklyDigestEmail}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        weeklyDigestEmail: !prev.notifications.weeklyDigestEmail,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="High-intent signal alerts in Slack"
                  description="Push high-confidence buying signals to Slack."
                  checked={draft.notifications.highIntentSignalSlack}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        highIntentSignalSlack: !prev.notifications.highIntentSignalSlack,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Scraper failure alerts in Slack"
                  description="Notify Slack when scraper runs fail or stall."
                  checked={draft.notifications.scraperFailureSlack}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        scraperFailureSlack: !prev.notifications.scraperFailureSlack,
                      },
                    }))
                  }
                />
                <ToggleField
                  label="Billing alerts via email"
                  description="Invoices, top-ups, and payment issues."
                  checked={draft.notifications.billingAlertsEmail}
                  onToggle={() =>
                    setDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        billingAlertsEmail: !prev.notifications.billingAlertsEmail,
                      },
                    }))
                  }
                />
              </div>
            </SettingCard>
          )}

          {activeTab === "integrations" && (
            <SettingCard
              title="Integrations"
              description="Manage provider connections and sync health."
            >
              <div className="space-y-2">
                {draft.integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-section/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-[12px] text-ink font-medium">{integration.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {integration.connectedAccount || "No account connected"}
                        {integration.lastSyncAt ? ` · synced ${formatRelativeTime(integration.lastSyncAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IntegrationBadge integration={integration} />
                      <button
                        type="button"
                        onClick={() => toggleIntegration(integration.id)}
                        className={cn(
                          "px-3 py-1 rounded-[16px] text-[11px] font-medium transition-colors",
                          integration.connected
                            ? "bg-section text-ink-secondary hover:bg-hover"
                            : "bg-ink text-on-ink hover:bg-ink/90"
                        )}
                      >
                        {integration.connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SettingCard>
          )}

          {activeTab === "billing" && (
            <SettingCard
              title="Security & Compliance"
              description="Billing protection and account-level controls."
            >
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <Shield size={14} strokeWidth={1.8} className="text-signal-green-text" />
                PCI-compliant billing provider. Card details are tokenized and never stored directly.
              </div>
            </SettingCard>
          )}
        </div>
      </div>
    </div>
  );
}
