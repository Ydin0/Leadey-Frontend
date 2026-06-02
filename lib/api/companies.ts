import { apiRequest } from "./client";
import type {
  CompaniesCommandCenterSnapshot,
  CompanyCommandAccount,
  CompanyPriorityQueueItem,
} from "@/lib/types/companies-command-center";

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
