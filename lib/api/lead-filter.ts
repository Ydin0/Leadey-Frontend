import { activeConditionCount, type FilterGroup } from "@/lib/types/lead-filter";

/** Encode a FilterGroup as base64 JSON for the `?filter=` query param. Returns
 *  undefined when there's nothing to apply (so the param is omitted). */
export function encodeFilter(group: FilterGroup | null | undefined): string | undefined {
  if (!group || activeConditionCount(group) === 0) return undefined;
  try {
    return typeof window === "undefined"
      ? Buffer.from(JSON.stringify(group)).toString("base64")
      : btoa(unescape(encodeURIComponent(JSON.stringify(group))));
  } catch {
    return undefined;
  }
}
