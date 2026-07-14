"use client";

import { useEffect, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { listSignatures, getSignatureDetails, type EmailSignature } from "@/lib/api/signatures";

// Shared signatures rarely change within a session — cache the first fetch so
// the picker can appear in several send surfaces without re-hitting the API.
let cache: EmailSignature[] | null = null;
let inflight: Promise<EmailSignature[]> | null = null;
async function loadSignatures(): Promise<EmailSignature[]> {
  if (cache) return cache;
  if (!inflight) inflight = listSignatures().then((s) => (cache = s)).catch(() => []);
  return inflight;
}
// The rep's personal default signature id — so the picker can name it.
let defaultCache: string | null | undefined;
let defaultInflight: Promise<string | null> | null = null;
async function loadDefaultId(): Promise<string | null> {
  if (defaultCache !== undefined) return defaultCache ?? null;
  if (!defaultInflight) defaultInflight = getSignatureDetails().then((d) => (defaultCache = d.defaultSignatureId)).catch(() => null);
  return defaultInflight;
}
/** Call after creating/editing/deleting a signature (or changing the default)
 *  so pickers refetch. */
export function invalidateSignatureCache() {
  cache = null;
  inflight = null;
  defaultCache = undefined;
  defaultInflight = null;
}

/**
 * Per-send signature choice. `value` is a signature id, `"none"`, or `"default"`
 * (use the mailbox's own configured signature). Renders nothing when the org has
 * no shared signatures — the mailbox default still applies silently, so there's
 * nothing to choose.
 */
export function SignaturePicker({
  value,
  onChange,
  className,
  label,
  labelClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  /** Optional field label rendered above the select (and hidden with it when
   *  the org has no shared signatures — for form layouts like the workflow node). */
  label?: string;
  labelClassName?: string;
}) {
  const [signatures, setSignatures] = useState<EmailSignature[]>(cache ?? []);
  const [defaultId, setDefaultId] = useState<string | null>(defaultCache ?? null);

  useEffect(() => {
    let alive = true;
    void loadSignatures().then((s) => { if (alive) setSignatures(s); });
    void loadDefaultId().then((d) => { if (alive) setDefaultId(d); });
    return () => { alive = false; };
  }, []);

  if (signatures.length === 0) return null;

  const defaultName = defaultId ? signatures.find((s) => s.id === defaultId)?.name : null;

  const select = (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Signature"
      className={
        className ??
        "text-[11px] bg-transparent border border-border-subtle rounded-[8px] px-2 py-1.5 text-ink-secondary max-w-[200px]"
      }
    >
      <option value="default">{defaultName ? `Default (${defaultName})` : "Default signature"}</option>
      {signatures.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
      <option value="none">No signature</option>
    </NativeSelect>
  );

  if (!label) return select;
  return (
    <>
      <label className={labelClassName}>{label}</label>
      {select}
    </>
  );
}
