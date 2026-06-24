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

// US (NANP) area code → IANA timezone, so +1 numbers resolve to the right zone
// by state instead of defaulting to Eastern. Built from grouped data.
const US_AREA_TZ: Record<string, string> = (() => {
  const groups: { tz: string; codes: number[] }[] = [
    { tz: "America/Chicago", codes: [205, 251, 256, 334, 938, 479, 501, 870, 217, 224, 309, 312, 331, 447, 464, 618, 630, 708, 730, 773, 779, 815, 847, 872, 219, 319, 515, 563, 641, 712, 316, 620, 785, 913, 270, 364, 225, 318, 337, 504, 985, 218, 320, 507, 612, 651, 763, 952, 228, 601, 662, 769, 314, 417, 557, 573, 636, 660, 816, 308, 402, 531, 701, 405, 539, 572, 580, 918, 605, 615, 629, 731, 901, 931, 210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 726, 737, 806, 817, 830, 832, 903, 936, 940, 956, 972, 979, 262, 274, 414, 534, 608, 715, 920, 906] },
    { tz: "America/New_York", codes: [203, 475, 860, 959, 302, 202, 239, 305, 321, 324, 352, 386, 407, 448, 561, 656, 689, 727, 754, 772, 786, 813, 850, 863, 904, 941, 954, 229, 404, 470, 478, 678, 706, 762, 770, 912, 943, 502, 606, 859, 207, 240, 301, 410, 443, 667, 339, 351, 413, 508, 617, 774, 781, 857, 978, 231, 248, 269, 313, 517, 586, 616, 679, 734, 810, 947, 989, 603, 201, 551, 609, 640, 732, 848, 856, 862, 908, 973, 212, 315, 332, 347, 363, 516, 518, 585, 607, 631, 646, 680, 716, 718, 838, 845, 914, 917, 929, 934, 252, 336, 704, 743, 828, 910, 919, 980, 984, 216, 220, 234, 283, 326, 330, 380, 419, 440, 513, 567, 614, 740, 937, 215, 223, 267, 272, 412, 445, 484, 570, 582, 610, 717, 724, 814, 835, 878, 401, 803, 839, 843, 854, 864, 423, 865, 802, 276, 434, 540, 571, 703, 757, 804, 826, 948, 304, 681] },
    { tz: "America/Denver", codes: [303, 719, 720, 970, 983, 505, 575, 406, 385, 435, 801, 307, 915] },
    { tz: "America/Phoenix", codes: [480, 520, 602, 623, 928] },
    { tz: "America/Los_Angeles", codes: [209, 213, 279, 310, 323, 341, 350, 408, 415, 424, 442, 510, 530, 559, 562, 619, 626, 628, 650, 657, 661, 669, 707, 714, 747, 760, 805, 818, 820, 831, 840, 858, 909, 916, 925, 949, 951, 702, 725, 775, 458, 503, 541, 971, 206, 253, 360, 425, 509, 564] },
    { tz: "America/Anchorage", codes: [907] },
    { tz: "Pacific/Honolulu", codes: [808] },
    { tz: "America/Boise", codes: [208, 986] },
    { tz: "America/Indiana/Indianapolis", codes: [260, 317, 463, 574, 765, 812, 930] },
    { tz: "America/Detroit", codes: [248, 313] /* most MI handled in NY-zone group above; Detroit precise here */ },
  ];
  const map: Record<string, string> = {};
  for (const g of groups) for (const c of g.codes) if (!map[String(c)]) map[String(c)] = g.tz;
  return map;
})();

function tzFromPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return undefined; // need an explicit country code
  const num = digits.slice(1);
  // US: resolve by area code for state-accurate zones.
  if (num.startsWith("1") && num.length >= 11) {
    const ac = num.slice(1, 4);
    if (US_AREA_TZ[ac]) return US_AREA_TZ[ac];
    return "America/New_York"; // unknown US area code → Eastern default
  }
  // Other countries: longest dial-code prefix first.
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

/** Format the current time in a given IANA zone → { label, hour, tz }. */
function formatInZone(tz: string): { label: string; hour: number; tz: string } | null {
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
    return { label: tzName ? `${time} ${tzName}` : time, hour: Number.isFinite(hour) ? hour : 12, tz };
  } catch {
    return null;
  }
}

/** The lead's current local time, e.g. "3:42 PM GMT", plus the local hour
 *  (0-23) so callers can flag out-of-hours. Null when no timezone is known. */
export function leadLocalTime(lead: FunnelLead): { label: string; hour: number; tz: string } | null {
  const tz = guessLeadTimezone(lead);
  return tz ? formatInZone(tz) : null;
}

/** Local time derived primarily from a phone number's prefix/area code (with an
 *  optional location-text fallback) — for per-contact display on the lead view. */
export function localTimeFromPhone(
  phone?: string | null,
  fallbackLocation?: string | null,
): { label: string; hour: number; tz: string } | null {
  const tz = tzFromPhone(phone) || tzFromLocation(fallbackLocation) || null;
  return tz ? formatInZone(tz) : null;
}
