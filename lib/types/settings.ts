export type TeamRole = "admin" | "manager" | "rep" | "viewer";

export interface ProfileSettings {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  timezone: string;
  locale: string;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
}

export interface OrganizationSettings {
  organizationName: string;
  website: string;
  billingEmail: string;
  primaryDomain: string;
  timezone: string;
  defaultCurrency: "USD" | "EUR" | "GBP";
  ssoRequired: boolean;
  ipAllowlistEnabled: boolean;
}

export interface TeamMemberSettings {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited" | "suspended";
  lastActive: Date | null;
}

export interface BillingSettings {
  planName: string;
  monthlyPriceUsd: number;
  billingCycle: "monthly" | "annual";
  creditsIncludedMonthly: number;
  creditsUsedThisMonth: number;
  autoTopUpEnabled: boolean;
  autoTopUpThreshold: number;
  autoTopUpAmount: number;
  paymentMethodLabel: string;
  nextInvoiceDate: Date;
}

export interface InvoiceRecord {
  id: string;
  periodLabel: string;
  totalUsd: number;
  status: "paid" | "due" | "failed";
  issuedAt: Date;
}

export interface NotificationSettings {
  criticalAlertsEmail: boolean;
  weeklyDigestEmail: boolean;
  highIntentSignalSlack: boolean;
  scraperFailureSlack: boolean;
  billingAlertsEmail: boolean;
}

export interface IntegrationSettings {
  id: string;
  name: string;
  category: "crm" | "enrichment" | "sending" | "communication";
  connected: boolean;
  connectedAccount: string | null;
  lastSyncAt: Date | null;
}

export interface AppSettingsSnapshot {
  profile: ProfileSettings;
  organization: OrganizationSettings;
  teamMembers: TeamMemberSettings[];
  billing: BillingSettings;
  invoices: InvoiceRecord[];
  notifications: NotificationSettings;
  integrations: IntegrationSettings[];
}
