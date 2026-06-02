import { apiRequest } from "./client";
import type {
  CompaniesCommandCenterSnapshot,
  CompanyCommandAccount,
  CompanyPriorityQueueItem,
} from "@/lib/types/companies-command-center";

/** A row in the org-wide companies table (Leads page → Companies view). */
export interface CompanyListRow {
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  employeeCount: number | null;
  fundingStage: string | null;
  country: string | null;
  city: string | null;
  logo: string | null;
  leadCount: number;
  enrichedCount: number;
  inCampaignCount: number;
}

/** GET /api/companies/list — every org company with lead counts + metadata. */
export async function getCompaniesList(): Promise<CompanyListRow[]> {
  return apiRequest<CompanyListRow[]>("/companies/list");
}

/** Wire shape — identical to the snapshot but with dates as ISO strings. */
type RawAccount = Omit<
  CompanyCommandAccount,
  "lastSignalAt" | "nextActionDueAt" | "lastTouchAt" | "topSignals"
> & {
  lastSignalAt: string;
  nextActionDueAt: string;
  lastTouchAt: string | null;
  topSignals: Array<{ id: string; type: string; summary: string; timestamp: string }>;
};

type RawSnapshot = Omit<
  CompaniesCommandCenterSnapshot,
  "generatedAt" | "accounts" | "queue"
> & {
  generatedAt: string;
  accounts: RawAccount[];
  queue: Array<Omit<CompanyPriorityQueueItem, "dueAt"> & { dueAt: string }>;
};

/** Fetches the Companies Command Center snapshot from the backend, reviving
 *  all ISO date strings back into `Date` objects the UI expects. */
export async function getCompaniesCommandCenter(
  signal?: AbortSignal,
): Promise<CompaniesCommandCenterSnapshot> {
  const raw = await apiRequest<RawSnapshot>("/companies/command-center", {
    signal,
  });

  return {
    ...raw,
    generatedAt: new Date(raw.generatedAt),
    accounts: raw.accounts.map((a) => ({
      ...a,
      lastSignalAt: new Date(a.lastSignalAt),
      nextActionDueAt: new Date(a.nextActionDueAt),
      lastTouchAt: a.lastTouchAt ? new Date(a.lastTouchAt) : null,
      topSignals: a.topSignals.map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      })),
    })) as CompanyCommandAccount[],
    queue: raw.queue.map((q) => ({ ...q, dueAt: new Date(q.dueAt) })),
  };
}
