/** Client-only ring buffer of recently-visited leads, used to populate the
 *  global search empty state (before you type anything). localStorage — no
 *  backend needed. Mirrors the `leadey:` key convention used elsewhere. */

export interface RecentLead {
  leadId: string;
  funnelId: string;
  name: string;
  company?: string | null;
  domain?: string | null;
  at: number;
}

const KEY = "leadey:recent-leads";
const MAX = 12;

export function recordRecentLead(entry: Omit<RecentLead, "at">): void {
  if (typeof window === "undefined" || !entry.leadId || !entry.funnelId) return;
  try {
    const list = readList();
    // Move-to-front: drop any existing entry for this lead, then prepend.
    const next = [{ ...entry, at: Date.now() }, ...list.filter((x) => x.leadId !== entry.leadId)];
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    // storage disabled / quota — non-fatal
  }
}

export function getRecentLeads(limit = 5): RecentLead[] {
  return readList().slice(0, limit);
}

function readList(): RecentLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as RecentLead[]).filter((x) => x && x.leadId && x.funnelId) : [];
  } catch {
    return [];
  }
}
