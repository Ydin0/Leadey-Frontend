"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BillingSection } from "./billing-section";
import { CreditsSection } from "./credits-section";
import { TeamSection } from "./team-section";
import { ProfileSection } from "./profile-section";
import { OrganizationSection } from "./organization-section";
import { LeadStatusesSection } from "./lead-statuses-section";
import { CampaignTagsSection } from "./campaign-tags-section";
import { TaskCategoriesSection } from "./task-categories-section";
import { CustomFieldsSection } from "./custom-fields-section";
import { ApiKeysSection } from "./api-keys-section";
import {
  Bell,
  Briefcase,
  Building2,
  Coins,
  CreditCard,
  Key,
  Linkedin,
  ListChecks,
  ListPlus,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  PlugZap,
  Save,
  Tags,
  Users,
  UserCircle2,
  X,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { mockSettings } from "@/lib/mock-data/settings";
import { UnipileIntegration } from "./unipile-integration";
import { CalendlyIntegration } from "./calendly-integration";
import { PhoneLinesTab } from "@/components/calling/settings/phone-lines-tab";
import { LocalPresenceSection } from "./local-presence-section";
import { CallOutcomesSection } from "./call-outcomes-section";
import { DialerSettingsTab } from "@/components/dialer/settings/dialer-settings-tab";
import { PipelineSettings } from "@/components/opportunities/settings/pipeline-settings";
import { LinkedInTeamTab } from "./linkedin-team-tab";
import { EmailAccountsSection } from "./email-accounts-section";
import { WhatsappSection } from "./whatsapp-section";
import type {
  AppSettingsSnapshot,
  IntegrationSettings,
} from "@/lib/types/settings";

type SettingsTab =
  | "profile"
  | "organization"
  | "team"
  | "lead-statuses"
  | "campaign-tags"
  | "task-categories"
  | "custom-fields"
  | "phone-lines"
  | "whatsapp"
  | "local-presence"
  | "call-outcomes"
  | "dialer"
  | "pipelines"
  | "linkedin"
  | "email-accounts"
  | "billing"
  | "credits"
  | "notifications"
  | "api-keys"
  | "integrations";

const tabs: { id: SettingsTab; label: string; icon: typeof UserCircle2 }[] = [
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "lead-statuses", label: "Lead Statuses", icon: Tags },
  { id: "campaign-tags", label: "Campaign Tags", icon: Tags },
  { id: "task-categories", label: "Task Categories", icon: ListChecks },
  { id: "custom-fields", label: "Custom Fields", icon: ListPlus },
  { id: "phone-lines", label: "Phone Lines", icon: Phone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "local-presence", label: "Local Presence", icon: MapPin },
  { id: "call-outcomes", label: "Call Outcomes", icon: PhoneCall },
  { id: "dialer", label: "Power Dialer", icon: PhoneCall },
  { id: "pipelines", label: "Pipelines", icon: Briefcase },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "email-accounts", label: "Email Accounts", icon: Mail },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "credits", label: "Credits", icon: Coins },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "integrations", label: "Integrations", icon: PlugZap },
];

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

const VALID_TABS: SettingsTab[] = [
  "profile",
  "organization",
  "team",
  "lead-statuses",
  "campaign-tags",
  "task-categories",
  "custom-fields",
  "phone-lines",
  "whatsapp",
  "local-presence",
  "call-outcomes",
  "dialer",
  "pipelines",
  "linkedin",
  "email-accounts",
  "billing",
  "credits",
  "notifications",
  "api-keys",
  "integrations",
];

export function SettingsShell() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as SettingsTab | null;
  const initialTab: SettingsTab =
    requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [draft, setDraft] = useState<AppSettingsSnapshot>(mockSettings);
  const [savedState, setSavedState] = useState<AppSettingsSnapshot>(mockSettings);

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
            <ProfileSection />
          )}

          {activeTab === "organization" && (
            <OrganizationSection />
          )}

          {activeTab === "team" && (
            <TeamSection />
          )}

          {activeTab === "lead-statuses" && <LeadStatusesSection />}
          {activeTab === "campaign-tags" && <CampaignTagsSection />}
          {activeTab === "task-categories" && <TaskCategoriesSection />}

          {activeTab === "custom-fields" && <CustomFieldsSection />}

          {activeTab === "phone-lines" && <PhoneLinesTab />}

          {activeTab === "whatsapp" && <WhatsappSection />}

          {activeTab === "local-presence" && <LocalPresenceSection />}

          {activeTab === "call-outcomes" && <CallOutcomesSection />}
          {activeTab === "email-accounts" && <EmailAccountsSection />}

          {activeTab === "dialer" && <DialerSettingsTab />}

          {activeTab === "pipelines" && <PipelineSettings />}

          {activeTab === "linkedin" && (
            <LinkedInTeamTab />
          )}

          {activeTab === "billing" && (
            <BillingSection />
          )}

          {activeTab === "credits" && (
            <CreditsSection />
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

          {activeTab === "api-keys" && <ApiKeysSection />}

          {activeTab === "integrations" && (
            <SettingCard
              title="Integrations"
              description="Manage provider connections and sync health."
            >
              <div className="space-y-2">
                <CalendlyIntegration />
                {draft.integrations
                  // Smartlead is our white-label backbone — managed centrally,
                  // never exposed to customers as a connectable integration.
                  .filter((integration) => integration.id !== "int_smartlead")
                  .map((integration) =>
                  integration.id === "int_unipile" ? (
                    <UnipileIntegration key={integration.id} />
                  ) : (
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
                  ),
                )}
              </div>
            </SettingCard>
          )}

        </div>
      </div>
    </div>
  );
}
