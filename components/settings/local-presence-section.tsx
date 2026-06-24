"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, Check, Lock, ShieldCheck } from "lucide-react";
import { cn, formatPhoneIntl } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import {
  getLocalPresenceCoverage, saveLocalPresenceConfig, provisionLocalNumber,
  type LocalPresenceConfig, type OwnedLocalLine,
} from "@/lib/api/calls";

export function LocalPresenceSection() {
  const isAuthReady = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LocalPresenceConfig | null>(null);
  const [lines, setLines] = useState<OwnedLocalLine[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [costPer, setCostPer] = useState(1.15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyAreaCode, setBuyAreaCode] = useState("");
  const [buying, setBuying] = useState(false);

  async function load() {
    try {
      const c = await getLocalPresenceCoverage();
      setConfig(c.config);
      setLines(c.lines);
      setIsAdmin(c.isAdmin);
      setCostPer(c.monthlyCostPerNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (isAuthReady) void load(); }, [isAuthReady]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(p: Partial<LocalPresenceConfig>) {
    if (!config) return;
    setConfig({ ...config, ...p });
    setSaving(true);
    setError(null);
    try {
      const next = await saveLocalPresenceConfig(p);
      setConfig(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function buy() {
    const ac = buyAreaCode.replace(/[^\d]/g, "").slice(0, 3);
    if (ac.length !== 3) { setError("Enter a 3-digit US area code."); return; }
    setBuying(true);
    setError(null);
    try {
      await provisionLocalNumber({ areaCode: ac });
      setBuyAreaCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not buy a number");
    } finally {
      setBuying(false);
    }
  }

  // Group owned numbers by state for the coverage view.
  const byState = useMemo(() => {
    const map = new Map<string, { stateName: string; nums: OwnedLocalLine[] }>();
    for (const l of lines) {
      const cur = map.get(l.state);
      if (cur) cur.nums.push(l);
      else map.set(l.state, { stateName: l.stateName, nums: [l] });
    }
    return [...map.values()].sort((a, b) => a.stateName.localeCompare(b.stateName));
  }, [lines]);

  if (loading || !config) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>;
  }

  const monthly = (lines.length * costPer).toFixed(2);

  return (
    <div className="space-y-6 max-w-[760px]">
      {/* Intro + master toggle */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2"><MapPin size={15} className="text-ink-muted" /> Local Presence Dialing</h3>
            <p className="text-[12px] text-ink-muted mt-1 max-w-[520px]">
              Automatically call US leads from one of your owned numbers in their own state, so they see a local caller ID. Numbers rotate to avoid spam-flagging. Only numbers you own are ever used.
            </p>
          </div>
          <Toggle
            on={config.enabled}
            disabled={!isAdmin || saving}
            onChange={(v) => patch({ enabled: v })}
          />
        </div>
        {!isAdmin && (
          <p className="text-[11px] text-ink-faint mt-3 flex items-center gap-1.5"><Lock size={11} /> Only an admin can change these settings.</p>
        )}
      </div>

      {/* Config */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5 space-y-4">
        <h4 className="text-[13px] font-semibold text-ink">Settings</h4>
        <Field label="Daily calls per number (rotation cap)" hint="Spread volume across numbers so none gets flagged. We rotate to the least-used number under this cap.">
          <input type="number" min={1} disabled={!isAdmin} value={config.perNumberDailyCap}
            onChange={(e) => setConfig({ ...config, perNumberDailyCap: Number(e.target.value) || 1 })}
            onBlur={(e) => patch({ perNumberDailyCap: Math.max(1, Number(e.target.value) || 1) })}
            className="w-28 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default disabled:opacity-60" />
        </Field>
        <Field label="Max numbers (spend ceiling)" hint={`Hard cap on how many numbers can be bought. You currently own ${lines.length} (~$${monthly}/mo).`}>
          <input type="number" min={0} disabled={!isAdmin} value={config.maxNumbers}
            onChange={(e) => setConfig({ ...config, maxNumbers: Number(e.target.value) || 0 })}
            onBlur={(e) => patch({ maxNumbers: Math.max(0, Number(e.target.value) || 0) })}
            className="w-28 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default disabled:opacity-60" />
        </Field>
        <Field label="Who can buy numbers" hint="New local numbers are a recurring cost — restrict purchasing to admins, or allow any rep.">
          <select disabled={!isAdmin} value={config.whoCanProvision}
            onChange={(e) => patch({ whoCanProvision: e.target.value as "admin" | "anyone" })}
            className="px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink focus:outline-none focus:border-border-default disabled:opacity-60">
            <option value="admin">Admins only</option>
            <option value="anyone">Anyone</option>
          </select>
        </Field>
        {error && <p className="text-[11px] text-signal-red-text">{error}</p>}
      </div>

      {/* Coverage */}
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[13px] font-semibold text-ink">Coverage</h4>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">{byState.length} states · {lines.length} numbers</span>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">Numbers you own, grouped by state. Buy a number for an area code to cover more states. Leads in a state you don&apos;t cover use your default line.</p>

        {isAdmin && (
          <div className="flex items-center gap-2 mb-4">
            <input value={buyAreaCode} onChange={(e) => setBuyAreaCode(e.target.value)} placeholder="Area code (e.g. 212)"
              className="w-44 px-2.5 py-1.5 rounded-[8px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default" />
            <button onClick={() => void buy()} disabled={buying || buyAreaCode.replace(/[^\d]/g, "").length !== 3}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {buying ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Buy number (~${costPer}/mo)
            </button>
          </div>
        )}

        {byState.length === 0 ? (
          <p className="text-[12px] text-ink-faint">No US local numbers yet. {isAdmin ? "Buy one above to start." : "Ask an admin to add numbers."}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {byState.map((g) => (
              <div key={g.stateName} className="flex items-center gap-3 py-2 px-3 rounded-[10px] bg-section/40 border border-border-subtle">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink w-[150px] shrink-0">
                  <Check size={12} className="text-signal-green-text" /> {g.stateName}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {g.nums.map((n) => (
                    <span key={n.id} className="text-[11px] text-ink-secondary tabular-nums bg-surface border border-border-subtle rounded-full px-2 py-0.5">
                      {formatPhoneIntl(n.number)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10.5px] text-ink-faint flex items-center gap-1.5">
        <ShieldCheck size={12} /> Caller ID is only ever set to numbers your organisation owns — this is compliant local presence (Twilio handles call attestation).
      </p>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50",
        on ? "bg-signal-green-text" : "bg-section border border-border-default",
      )}
    >
      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-ink">{label}</p>
        {hint && <p className="text-[11px] text-ink-muted mt-0.5 max-w-[440px]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
