"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Coins,
  Phone,
  Mail,
  Briefcase,
  Plus,
  Check,
  Loader2,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useCredits } from "@/components/providers/credits-provider";
import {
  getCreditTransactions,
  startCreditCheckout,
  creditsToUsd,
  getTelephonyCredits,
  updateTelephonySettings,
  type CreditTransaction,
  type TelephonyCredits,
} from "@/lib/api/credits";

const ACTION_LABELS: Record<string, string> = {
  phone_enrichment: "Phone enrichment",
  email_enrichment: "Email enrichment",
  job_scraping: "Job scraping",
  topup: "Top-up",
  plan_grant: "Plan credits",
  signup_grant: "Trial credits",
  admin_adjustment: "Adjustment",
  refund: "Refund",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ");
}

export function CreditsSection() {
  const { info, balance, loading, refresh } = useCredits();
  const searchParams = useSearchParams();
  const centsPerCredit = info?.centsPerCredit ?? 1;

  const [checkoutBusy, setCheckoutBusy] = useState<number | "custom" | null>(null);
  const [customCredits, setCustomCredits] = useState("");
  const [showTopupSuccess, setShowTopupSuccess] = useState(false);

  const [txns, setTxns] = useState<CreditTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [telephony, setTelephony] = useState<TelephonyCredits | null>(null);

  const refreshTelephony = useCallback(() => {
    getTelephonyCredits().then(setTelephony).catch(() => {});
  }, []);

  useEffect(() => {
    refreshTelephony();
  }, [refreshTelephony]);

  const minTopup = info?.minTopup ?? 500;

  // Stripe returned after a top-up — refresh the balance and flash a banner.
  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      setShowTopupSuccess(true);
      refresh();
      const t = setTimeout(() => refresh(), 2500); // webhook may lag a moment
      return () => clearTimeout(t);
    }
  }, [searchParams, refresh]);

  const loadTxns = useCallback(async (p: number) => {
    setTxLoading(true);
    try {
      const res = await getCreditTransactions({ page: p, pageSize: 12 });
      setTxns(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTxns(page);
  }, [page, loadTxns]);

  async function checkout(credits: number, key: number | "custom") {
    if (!credits || credits < minTopup) return;
    setCheckoutBusy(key);
    try {
      const url = await startCreditCheckout(credits);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutBusy(null);
    }
  }

  const usage = info?.usageThisMonth;
  const low = balance > 0 && balance < 100;
  const empty = balance <= 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {showTopupSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] bg-signal-green/10 border border-signal-green-text/20">
          <Check size={15} className="text-signal-green-text shrink-0" />
          <span className="text-[12px] text-ink-secondary">
            Top-up successful — your balance updates within a few seconds.
          </span>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
              <Coins size={12} className="text-accent" /> Credit balance
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-[34px] font-semibold tabular-nums leading-none", empty ? "text-signal-red-text" : "text-ink")}>
                {loading && !info ? "—" : balance.toLocaleString()}
              </span>
              <span className="text-[13px] text-ink-muted">credits</span>
            </div>
            <p className="text-[12px] text-ink-muted mt-1.5">
              Worth {creditsToUsd(balance, centsPerCredit)} · 1 credit = ${(centsPerCredit / 100).toFixed(2)}
            </p>
            {(low || empty) && (
              <p className={cn("text-[11px] mt-2 font-medium", empty ? "text-signal-red-text" : "text-amber-600 dark:text-amber-400")}>
                {empty
                  ? "You're out of credits — enrichment and scraping are paused until you top up."
                  : "Running low — top up to avoid interruptions."}
              </p>
            )}
          </div>
          <a
            href="#top-up"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Top up
          </a>
        </div>
      </div>

      {/* Telephony wallet — calls/SMS/numbers usage vs paid invoices */}
      {telephony && <TelephonyBalanceCard data={telephony} onRefresh={refreshTelephony} />}

      {/* Cost table */}
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">What credits cost</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Phone, label: "Phone enrichment", cost: info?.costs.phone ?? 33, unit: "per number found" },
            { icon: Mail, label: "Email enrichment", cost: info?.costs.email ?? 3, unit: "per email found" },
            { icon: Briefcase, label: "Job scraping", cost: info?.costs.job ?? 1, unit: "per job found" },
          ].map((c) => (
            <div key={c.label} className="rounded-[12px] border border-border-subtle bg-section/40 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-surface border border-border-subtle flex items-center justify-center">
                  <c.icon size={13} className="text-ink-secondary" />
                </div>
                <span className="text-[12px] font-medium text-ink">{c.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-semibold text-ink tabular-nums">{c.cost}</span>
                <span className="text-[11px] text-ink-muted">credits · {creditsToUsd(c.cost, centsPerCredit)}</span>
              </div>
              <p className="text-[10.5px] text-ink-faint mt-0.5">{c.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage this month */}
      <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3">Usage this month</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UsageStat icon={TrendingDown} label="Total spent" value={`${(usage?.totalSpent ?? 0).toLocaleString()}`} sub={creditsToUsd(usage?.totalSpent ?? 0, centsPerCredit)} />
          <UsageStat icon={Phone} label="Phones" value={`${usage?.phoneEnrichment.quantity ?? 0}`} sub={`${Math.abs(usage?.phoneEnrichment.credits ?? 0)} cr`} />
          <UsageStat icon={Mail} label="Emails" value={`${usage?.emailEnrichment.quantity ?? 0}`} sub={`${Math.abs(usage?.emailEnrichment.credits ?? 0)} cr`} />
          <UsageStat icon={Briefcase} label="Jobs" value={`${usage?.jobScraping.quantity ?? 0}`} sub={`${Math.abs(usage?.jobScraping.credits ?? 0)} cr`} />
        </div>
      </div>

      {/* Top up */}
      <div id="top-up" className="rounded-[14px] border border-border-subtle bg-surface p-5 scroll-mt-20">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Top up credits</h3>
        <p className="text-[12px] text-ink-muted mb-4">Credits never expire. Pay securely with Stripe — ${(centsPerCredit / 100).toFixed(2)} per credit.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {(info?.packs ?? []).map((p) => (
            <button
              key={p.credits}
              onClick={() => checkout(p.credits, p.credits)}
              disabled={checkoutBusy !== null}
              className="group rounded-[12px] border border-border-subtle bg-section/40 p-3.5 text-left hover:border-accent/50 hover:bg-hover transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <Sparkles size={13} className="text-accent" />
                {checkoutBusy === p.credits && <Loader2 size={12} className="animate-spin text-ink-muted" />}
              </div>
              <div className="text-[16px] font-semibold text-ink tabular-nums mt-2">{p.credits.toLocaleString()}</div>
              <div className="text-[11px] text-ink-muted">credits</div>
              <div className="text-[12px] font-medium text-accent mt-1.5">${p.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Custom amount</label>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={customCredits}
                onChange={(e) => setCustomCredits(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={`min ${minTopup}`}
                className="w-36 bg-section border border-border-subtle rounded-[8px] px-3 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default tabular-nums"
              />
              <span className="text-[12px] text-ink-muted">
                credits {customCredits && Number(customCredits) >= minTopup ? `· ${creditsToUsd(Number(customCredits), centsPerCredit)}` : ""}
              </span>
            </div>
          </div>
          <button
            onClick={() => checkout(Number(customCredits), "custom")}
            disabled={checkoutBusy !== null || Number(customCredits) < minTopup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {checkoutBusy === "custom" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
            Buy credits
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-[14px] border border-border-subtle bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
          <h3 className="text-[13px] font-semibold text-ink">Usage history</h3>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || txLoading}
                className="px-2.5 py-1 rounded-full text-[11px] text-ink-secondary border border-border-subtle hover:bg-hover disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[11px] text-ink-muted tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || txLoading}
                className="px-2.5 py-1 rounded-full text-[11px] text-ink-secondary border border-border-subtle hover:bg-hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle bg-section/50 hover:bg-section/50">
              <TableHead className="text-left">Activity</TableHead>
              <TableHead className="text-center w-[90px]">Qty</TableHead>
              <TableHead className="text-right w-[110px]">Credits</TableHead>
              <TableHead className="text-right w-[120px]">Balance</TableHead>
              <TableHead className="text-right w-[160px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txns.map((t) => (
              <TableRow key={t.id} className="hover:bg-hover/40">
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-ink">{actionLabel(t.action)}</span>
                    {t.description && <span className="text-[10px] text-ink-faint truncate max-w-[220px]">· {t.description}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-center text-[11px] text-ink-muted tabular-nums">{t.quantity}</TableCell>
                <TableCell className={cn("text-right text-[12px] font-medium tabular-nums", t.credits < 0 ? "text-ink-secondary" : "text-signal-green-text")}>
                  {t.credits > 0 ? "+" : ""}{t.credits.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-[11px] text-ink-muted tabular-nums">{t.balanceAfter.toLocaleString()}</TableCell>
                <TableCell className="text-right text-[11px] text-ink-faint">
                  {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {txns.length === 0 && !txLoading && (
          <div className="py-8 text-center"><p className="text-[12px] text-ink-muted">No credit activity yet.</p></div>
        )}
      </div>
    </div>
  );
}

const MONEY_INPUT_CLASS =
  "w-28 bg-section border border-border-subtle rounded-[8px] pl-6 pr-3 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default tabular-nums";

function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-flex items-center">
      <span className="absolute left-2.5 text-[11px] text-ink-faint pointer-events-none">$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(MONEY_INPUT_CLASS, disabled && "opacity-50")}
      />
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50",
        on ? "bg-signal-green-text" : "bg-section border border-border-default",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** The org's telephony money wallet: calls, SMS and phone-number rental draw
 *  it down as they happen; invoice payments or auto top-ups add to it. Also
 *  hosts the monthly spending limit + auto top-up settings (Close-style). */
function TelephonyBalanceCard({ data, onRefresh }: { data: TelephonyCredits; onRefresh: () => void }) {
  const currency = (data.currency || "usd").toUpperCase();
  const fmt = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
  const owing = data.balanceMinor < 0;
  const { budget, autoTopup } = data;

  // Editable drafts (major units), seeded once from the server state.
  const [limitDraft, setLimitDraft] = useState(budget.limitMinor ? String(budget.limitMinor / 100) : "");
  const [atEnabled, setAtEnabled] = useState(autoTopup.enabled);
  const [thresholdDraft, setThresholdDraft] = useState(
    autoTopup.enabled || autoTopup.thresholdMinor > 0 ? String(autoTopup.thresholdMinor / 100) : "",
  );
  const [targetDraft, setTargetDraft] = useState(
    autoTopup.enabled || autoTopup.targetMinor > 0 ? String(autoTopup.targetMinor / 100) : "",
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const toMinor = (s: string) => Math.round((parseFloat(s) || 0) * 100);
  const spentPct = budget.limitMinor ? Math.min(100, (budget.spentMinor / budget.limitMinor) * 100) : 0;

  async function save() {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await updateTelephonySettings({
        monthlyLimitMinor: limitDraft.trim() === "" ? null : toMinor(limitDraft),
        autoTopupEnabled: atEnabled,
        autoTopupThresholdMinor: toMinor(thresholdDraft),
        autoTopupTargetMinor: toMinor(targetDraft),
      });
      if (res.immediateTopup.charged) {
        setNotice({
          tone: "ok",
          text: `Saved — your card was charged ${fmt(res.immediateTopup.amountMinor ?? 0)} to bring the balance up to target.`,
        });
      } else if (res.immediateTopup.error) {
        setNotice({ tone: "err", text: `Saved, but the top-up charge failed: ${res.immediateTopup.error}` });
      } else {
        setNotice({ tone: "ok", text: "Settings saved." });
      }
      onRefresh();
    } catch (err) {
      setNotice({ tone: "err", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface p-5">
      {/* ── Balance ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
            <Phone size={12} className="text-accent" /> Telephony balance
            {owing && (
              <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-red-text bg-signal-red/15 px-1.5 py-0.5 rounded-full">
                Owing
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-[34px] font-semibold tabular-nums leading-none", owing ? "text-signal-red-text" : "text-ink")}>
              {fmt(data.balanceMinor)}
            </span>
            {!autoTopup.enabled && <span className="text-[13px] text-ink-muted">buffer {data.bufferPct}%</span>}
          </div>
          {owing && !autoTopup.enabled && (
            <p className="text-[12px] text-ink-secondary mt-1.5 tabular-nums">
              Usage to date {fmt(Math.abs(data.balanceMinor))} · next invoice ≈{" "}
              <span className="font-medium text-ink">
                {fmt(Math.round(Math.abs(data.balanceMinor) * (1 + data.bufferPct / 100)))}
              </span>
            </p>
          )}
          <p className="text-[11px] text-ink-muted mt-1.5 max-w-[520px]">
            Calls, texts and phone-number rental draw this down as you use them;{" "}
            {autoTopup.enabled
              ? "auto top-up recharges it from your saved card."
              : `paying your telephony invoice (usage + a ${data.bufferPct}% calling buffer) tops it back up.`}
          </p>
        </div>
      </div>

      {/* ── Current spend vs monthly budget ── */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Current spend</p>
        <p className="text-[12px] text-ink-secondary tabular-nums">
          Your team has used <span className="font-medium text-ink">{fmt(budget.spentMinor)}</span> this month
          {budget.limitMinor ? <> of your {fmt(budget.limitMinor)} budget.</> : <> — no monthly limit set.</>}
        </p>
        {budget.limitMinor != null && (
          <>
            <div className="mt-2 h-1.5 rounded-full bg-section overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", spentPct >= 100 ? "bg-signal-red-text" : spentPct >= 80 ? "bg-amber-500" : "bg-signal-green-text")}
                style={{ width: `${Math.max(spentPct, 1)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10.5px] text-ink-faint tabular-nums">
              <span>{fmt(0)}</span>
              <span>{fmt(budget.limitMinor)} budget</span>
            </div>
          </>
        )}
        {budget.blocked && (
          <p className="text-[11px] font-medium text-signal-red-text mt-1.5">
            Budget reached — outbound calls and texts are paused until you raise the limit or the month rolls over.
          </p>
        )}
      </div>

      {/* ── Monthly spending limit ── */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">Monthly spending limit</p>
        <p className="text-[11px] text-ink-muted mb-2 max-w-[520px]">
          Keep your team within a budget for calling and texting. When the month&apos;s usage reaches
          this amount, outbound calls and SMS pause until the next month. Leave empty for no limit.
        </p>
        <div className="flex items-center gap-2">
          <MoneyInput value={limitDraft} onChange={setLimitDraft} placeholder="No limit" />
          <span className="text-[11px] text-ink-faint">per month</span>
        </div>
      </div>

      {/* ── Auto top-up ── */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1">Auto top-up</p>
            <p className="text-[11px] text-ink-muted max-w-[440px]">
              Automatically recharge your balance from your saved card so calling and texting never
              stop. While enabled, telephony is billed through these charges instead of monthly
              invoices.
            </p>
          </div>
          <Toggle on={atEnabled} onChange={setAtEnabled} disabled={saving} />
        </div>
        {atEnabled && (
          <div className="flex items-end gap-4 flex-wrap mt-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
                When balance goes below
              </label>
              <MoneyInput value={thresholdDraft} onChange={setThresholdDraft} placeholder="25" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
                Recharge to
              </label>
              <MoneyInput value={targetDraft} onChange={setTargetDraft} placeholder="200" />
            </div>
          </div>
        )}
        {autoTopup.lastError && atEnabled && (
          <p className="text-[11px] font-medium text-signal-red-text mt-2">
            Last top-up attempt failed: {autoTopup.lastError}
          </p>
        )}
      </div>

      {/* ── Save ── */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
        {notice && (
          <p className={cn("text-[11.5px]", notice.tone === "err" ? "text-signal-red-text font-medium" : "text-signal-green-text")}>
            {notice.text}
          </p>
        )}
        <button
          onClick={() => void save()}
          disabled={saving || (atEnabled && (toMinor(targetDraft) <= toMinor(thresholdDraft) || toMinor(targetDraft) <= 0))}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save settings
        </button>
      </div>
    </div>
  );
}

function UsageStat({ icon: Icon, label, value, sub }: { icon: typeof Phone; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-section/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
        <Icon size={11} /> {label}
      </div>
      <div className="text-[18px] font-semibold text-ink tabular-nums leading-none">{value}</div>
      <div className="text-[10.5px] text-ink-faint mt-1">{sub}</div>
    </div>
  );
}
