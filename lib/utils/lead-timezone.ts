import type { FunnelLead } from "@/lib/types/funnel";

/**
 * Best-effort IANA timezone for a lead, derived (in priority order) from its
 * company location string, phone country code, then domain/email TLD. Returns
 * null when nothing reliable is found.
 *
 * No timezone DB is bundled, so this maps common sales geographies to a
 * representative zone — country-accurate everywhere, and region-accurate for
 * the larger multi-zone countries (US/Canada/Australia) where a city/state is
 * named.
 */

// City / region keywords → zone, checked before the country fallback so the
// big multi-timezone countries land in the right zone when a city is given.
const REGION_RULES: { tz: string; keys: string[] }[] = [
  // US — Pacific / Mountain / Central / Eastern
  { tz: "America/Los_Angeles", keys: ["san francisco", "los angeles", "san diego", "seattle", "portland, or", "oregon", "california", "silicon valley", "bay area", "nevada", "las vegas"] },
  { tz: "America/Denver", keys: ["denver", "colorado", "salt lake", "utah", "boise", "idaho", "new mexico", "albuquerque"] },
  { tz: "America/Phoenix", keys: ["phoenix", "arizona", "tucson", "scottsdale"] },
  { tz: "America/Chicago", keys: ["chicago", "illinois", "texas", "dallas", "houston", "austin", "san antonio", "minneapolis", "minnesota", "kansas", "missouri", "st. louis", "nashville", "tennessee", "wisconsin", "milwaukee", "oklahoma", "nebraska", "iowa"] },
  { tz: "America/New_York", keys: ["new york", "boston", "massachusetts", "atlanta", "georgia", "miami", "florida", "washington, d", "washington dc", "philadelphia", "pennsylvania", "ohio", "michigan", "detroit", "north carolina", "charlotte", "virginia", "new jersey", "connecticut", "maryland", "indiana", "indianapolis"] },
  // Canada
  { tz: "America/Vancouver", keys: ["vancouver", "british columbia"] },
  { tz: "America/Edmonton", keys: ["calgary", "edmonton", "alberta"] },
  { tz: "America/Toronto", keys: ["toronto", "ottawa", "montreal", "quebec", "ontario"] },
  // Australia
  { tz: "Australia/Perth", keys: ["perth", "western australia"] },
  { tz: "Australia/Brisbane", keys: ["brisbane", "queensland"] },
  { tz: "Australia/Sydney", keys: ["sydney", "melbourne", "canberra", "new south wales", "victoria"] },
];

// Country-name fallback (lowercased substring) → representative zone.
const COUNTRY_RULES: { tz: string; keys: string[] }[] = [
  { tz: "Europe/London", keys: ["united kingdom", "england", "scotland", "wales", "northern ireland", "great britain"] },
  { tz: "Europe/Dublin", keys: ["ireland", "dublin"] },
  { tz: "America/New_York", keys: ["united states", "usa", "u.s.a", "u.s."] },
  { tz: "America/Toronto", keys: ["canada"] },
  { tz: "Australia/Sydney", keys: ["australia"] },
  { tz: "Pacific/Auckland", keys: ["new zealand"] },
  { tz: "Europe/Paris", keys: ["france"] },
  { tz: "Europe/Berlin", keys: ["germany", "deutschland"] },
  { tz: "Europe/Madrid", keys: ["spain", "españa"] },
  { tz: "Europe/Rome", keys: ["italy", "italia"] },
  { tz: "Europe/Amsterdam", keys: ["netherlands", "holland"] },
  { tz: "Europe/Brussels", keys: ["belgium"] },
  { tz: "Europe/Zurich", keys: ["switzerland"] },
  { tz: "Europe/Lisbon", keys: ["portugal"] },
  { tz: "Europe/Stockholm", keys: ["sweden"] },
  { tz: "Europe/Oslo", keys: ["norway"] },
  { tz: "Europe/Copenhagen", keys: ["denmark"] },
  { tz: "Europe/Helsinki", keys: ["finland"] },
  { tz: "Europe/Warsaw", keys: ["poland"] },
  { tz: "Europe/Vienna", keys: ["austria"] },
  { tz: "Europe/Athens", keys: ["greece"] },
  { tz: "Asia/Dubai", keys: ["united arab emirates", "uae", "dubai", "abu dhabi"] },
  { tz: "Asia/Kolkata", keys: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad"] },
  { tz: "Asia/Singapore", keys: ["singapore"] },
  { tz: "Asia/Hong_Kong", keys: ["hong kong"] },
  { tz: "Asia/Tokyo", keys: ["japan"] },
  { tz: "Africa/Johannesburg", keys: ["south africa"] },
  { tz: "America/Sao_Paulo", keys: ["brazil", "brasil"] },
  { tz: "America/Mexico_City", keys: ["mexico", "méxico"] },
];

// Phone dial code → zone (longest prefix wins).
const PHONE_RULES: { code: string; tz: string }[] = [
  { code: "44", tz: "Europe/London" }, { code: "353", tz: "Europe/Dublin" },
  { code: "1", tz: "America/New_York" }, { code: "33", tz: "Europe/Paris" },
  { code: "49", tz: "Europe/Berlin" }, { code: "34", tz: "Europe/Madrid" },
  { code: "39", tz: "Europe/Rome" }, { code: "31", tz: "Europe/Amsterdam" },
  { code: "32", tz: "Europe/Brussels" }, { code: "41", tz: "Europe/Zurich" },
  { code: "351", tz: "Europe/Lisbon" }, { code: "46", tz: "Europe/Stockholm" },
  { code: "47", tz: "Europe/Oslo" }, { code: "45", tz: "Europe/Copenhagen" },
  { code: "358", tz: "Europe/Helsinki" }, { code: "48", tz: "Europe/Warsaw" },
  { code: "43", tz: "Europe/Vienna" }, { code: "30", tz: "Europe/Athens" },
  { code: "61", tz: "Australia/Sydney" }, { code: "64", tz: "Pacific/Auckland" },
  { code: "91", tz: "Asia/Kolkata" }, { code: "65", tz: "Asia/Singapore" },
  { code: "971", tz: "Asia/Dubai" }, { code: "852", tz: "Asia/Hong_Kong" },
  { code: "81", tz: "Asia/Tokyo" }, { code: "27", tz: "Africa/Johannesburg" },
  { code: "55", tz: "America/Sao_Paulo" }, { code: "52", tz: "America/Mexico_City" },
];

// Domain / email TLD → zone (country TLDs only; .com/.io/.org are ambiguous).
const TLD_RULES: Record<string, string> = {
  uk: "Europe/London", ie: "Europe/Dublin", fr: "Europe/Paris", de: "Europe/Berlin",
  es: "Europe/Madrid", it: "Europe/Rome", nl: "Europe/Amsterdam", be: "Europe/Brussels",
  ch: "Europe/Zurich", pt: "Europe/Lisbon", se: "Europe/Stockholm", no: "Europe/Oslo",
  dk: "Europe/Copenhagen", fi: "Europe/Helsinki", pl: "Europe/Warsaw", at: "Europe/Vienna",
  au: "Australia/Sydney", nz: "Pacific/Auckland", in: "Asia/Kolkata", sg: "Asia/Singapore",
  ae: "Asia/Dubai", hk: "Asia/Hong_Kong", jp: "Asia/Tokyo", za: "Africa/Johannesburg",
  ca: "America/Toronto",
};

function tzFromLocation(loc?: string | null): string | undefined {
  if (!loc) return undefined;
  const s = loc.toLowerCase();
  for (const r of REGION_RULES) if (r.keys.some((k) => s.includes(k))) return r.tz;
  for (const r of COUNTRY_RULES) if (r.keys.some((k) => s.includes(k))) return r.tz;
  return undefined;
}

function tzFromPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return undefined; // need an explicit country code
  const num = digits.slice(1);
  // Longest dial-code prefix first.
  for (const r of [...PHONE_RULES].sort((a, b) => b.code.length - a.code.length)) {
    if (num.startsWith(r.code)) return r.tz;
  }
  return undefined;
}

function tzFromTld(domainOrEmail?: string | null): string | undefined {
  if (!domainOrEmail) return undefined;
  const host = domainOrEmail.includes("@") ? domainOrEmail.split("@")[1] : domainOrEmail;
  const tld = host?.trim().toLowerCase().split(".").pop();
  return tld ? TLD_RULES[tld] : undefined;
}

export function guessLeadTimezone(lead: FunnelLead): string | null {
  return (
    tzFromLocation(lead.companyLocation) ||
    tzFromPhone(lead.phone) ||
    tzFromTld(lead.companyDomain || lead.email) ||
    null
  );
}

/** The lead's current local time, e.g. "3:42 PM · GMT", plus the local hour
 *  (0-23) so callers can flag out-of-hours. Null when no timezone is known. */
export function leadLocalTime(lead: FunnelLead): { label: string; hour: number; tz: string } | null {
  const tz = guessLeadTimezone(lead);
  if (!tz) return null;
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const tzName = get("timeZoneName");
    const time = `${get("hour")}:${get("minute")} ${get("dayPeriod")}`.replace(/\s+/g, " ").trim();
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now),
    );
    return { label: tzName ? `${time} · ${tzName}` : time, hour: Number.isFinite(hour) ? hour : 12, tz };
  } catch {
    return null;
  }
}
