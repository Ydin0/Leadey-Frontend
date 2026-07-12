import { TEMPLATE_VARIABLES } from "@/lib/types/template";

export { TEMPLATE_VARIABLES };

/** The fields we can pull personalization values from — a loose superset of
 *  FunnelLead / contact shapes so any caller can pass what it has. */
export interface PersonalizationLead {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
  email?: string | null;
  companyDomain?: string | null;
}

export interface PersonalizationContext {
  /** The sending rep's display name, for {{sender_name}}. */
  senderName?: string;
  /** The sending rep's details, for {{sender_*}} signature variables + custom
   *  fields (keyed without the "sender_" prefix, e.g. { booking_link }). */
  sender?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    company?: string | null;
    fields?: Record<string, string> | null;
  };
}

/** Resolve the `{{variable}}` → value map for a lead. Mirrors the variable
 *  catalog in TEMPLATE_VARIABLES so editor, composer, inbox and step builder
 *  all personalize identically. */
export function buildVariableMap(
  lead: PersonalizationLead,
  ctx?: PersonalizationContext,
): Record<string, string> {
  const full =
    lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "";
  const parts = full.split(" ").filter(Boolean);
  const domain = lead.companyDomain || (lead.email?.split("@")[1] ?? "");
  const s = ctx?.sender;
  const sFirst = s?.firstName || "";
  const sLast = s?.lastName || "";
  const map: Record<string, string> = {
    first_name: lead.firstName || parts[0] || "",
    last_name: lead.lastName || parts.slice(1).join(" ") || "",
    full_name: full,
    company: lead.company || "",
    title: lead.title || "",
    email: lead.email || "",
    domain,
    sender_name: ctx?.senderName || "",
    sender_first_name: sFirst,
    sender_last_name: sLast,
    sender_full_name: [sFirst, sLast].filter(Boolean).join(" "),
    sender_email: s?.email || "",
    sender_phone: s?.phone || "",
    sender_title: s?.title || "",
    sender_company: s?.company || "",
  };
  for (const [k, v] of Object.entries(s?.fields || {})) map[`sender_${k}`] = String(v ?? "");
  return map;
}

/** Replace every `{{key}}` token in `text` with the lead's value. Unknown
 *  tokens are left intact so the rep can see what didn't resolve. */
export function renderPersonalized(
  text: string,
  lead: PersonalizationLead,
  ctx?: PersonalizationContext,
): string {
  const map = buildVariableMap(lead, ctx);
  return (text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in map ? map[key] : `{{${key}}}`,
  );
}

/** True if the text still contains an unresolved token after personalization
 *  against `lead` — useful to warn before sending. */
export function hasUnresolvedVariables(
  text: string,
  lead: PersonalizationLead,
  ctx?: PersonalizationContext,
): boolean {
  return /\{\{\s*\w+\s*\}\}/.test(renderPersonalized(text, lead, ctx));
}
