import {
  type FilterGroup,
  type FilterCondition,
  fieldDef,
  NO_VALUE_OPS,
} from "@/lib/types/lead-filter";

/** Resolves a field key to the value for the row being tested. The caller wires
 *  this to a lead + any derived maps (activity counts, leads-in-company). */
export type ValueGetter = (fieldKey: string) => unknown;

const asNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const asStr = (v: unknown): string => (v == null ? "" : String(v));

function isComplete(c: FilterCondition): boolean {
  if (!c.field || !c.op) return false;
  if (NO_VALUE_OPS.has(c.op)) return true;
  return c.value != null && c.value !== "" && !(Array.isArray(c.value) && c.value.length === 0);
}

function evalCondition(c: FilterCondition, get: ValueGetter): boolean {
  const def = fieldDef(c.field);
  const raw = get(c.field);

  if (c.op === "is_empty" || c.op === "is_set") {
    const present = Array.isArray(raw)
      ? raw.length > 0
      : raw != null && String(raw).trim() !== "" && !(def?.type === "number" && asNum(raw) == null);
    return c.op === "is_set" ? present : !present;
  }

  const val = c.value;

  if (def?.type === "number") {
    const n = asNum(raw);
    if (c.op === "is") return n === asNum(val);
    if (n == null) return false;
    if (c.op === "gt") return n > (asNum(val) ?? n);
    if (c.op === "gte") return n >= (asNum(val) ?? n + 1);
    if (c.op === "lt") return n < (asNum(val) ?? n);
    if (c.op === "lte") return n <= (asNum(val) ?? n - 1);
    if (c.op === "between" && Array.isArray(val)) {
      const a = asNum(val[0]);
      const b = asNum(val[1]);
      return a != null && b != null && n >= a && n <= b;
    }
    return true;
  }

  if (def?.type === "boolean") {
    const b = raw === true || raw === "true";
    return c.op === "is" ? b === (asStr(val) === "true") : true;
  }

  if (def?.type === "date") {
    const t = raw ? new Date(raw as string | number | Date).getTime() : NaN;
    if (Number.isNaN(t)) return false;
    if (c.op === "before") return t < new Date(asStr(val)).getTime();
    if (c.op === "after") return t > new Date(asStr(val)).getTime();
    if (c.op === "between" && Array.isArray(val)) {
      return t >= new Date(asStr(val[0])).getTime() && t <= new Date(asStr(val[1])).getTime();
    }
    return true;
  }

  if (def?.type === "enum") {
    const s = asStr(raw).toLowerCase();
    const arr = (Array.isArray(val) ? val : [val]).map((x) => asStr(x).toLowerCase());
    if (c.op === "is") return arr.includes(s);
    if (c.op === "is_not") return !arr.includes(s);
    return true;
  }

  // Phone: digit-normalized on both sides — "+44 7911 220866", "+447911…"
  // and "07911…" must all match a "+447" query. The UK trunk form (leading
  // 0) is also tried as its international form (44…).
  if (c.field === "phone") {
    const dq = asStr(Array.isArray(val) ? val[0] : val).replace(/\D/g, "");
    if (dq) {
      const dv = asStr(raw).replace(/\D/g, "");
      const forms = dv.startsWith("0") ? [dv, "44" + dv.slice(1)] : [dv];
      if (c.op === "contains") return forms.some((f) => f.includes(dq));
      if (c.op === "not_contains") return !forms.some((f) => f.includes(dq));
      if (c.op === "is") return forms.includes(dq);
      if (c.op === "is_not") return !forms.includes(dq);
    }
  }

  // text
  const s = asStr(raw).toLowerCase();
  const q = asStr(Array.isArray(val) ? val[0] : val).toLowerCase();
  if (c.op === "contains") return s.includes(q);
  if (c.op === "not_contains") return !s.includes(q);
  if (c.op === "is") return s === q;
  if (c.op === "is_not") return s !== q;
  return true;
}

/** Evaluate a FilterGroup against one row. Incomplete conditions are ignored so
 *  a half-built rule never empties the list. AND requires all; OR requires any. */
export function matchesFilter(group: FilterGroup | null | undefined, get: ValueGetter): boolean {
  if (!group) return true;
  const active = group.conditions.filter(isComplete);
  if (active.length === 0) return true;
  const results = active.map((c) => evalCondition(c, get));
  return group.match === "or" ? results.some(Boolean) : results.every(Boolean);
}
