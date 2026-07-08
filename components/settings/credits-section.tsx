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
  telephonyTopupNow,
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

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-ink-muted font-medium";

export function CreditsSection() {
  const { info, balance, loading, refresh } = useCredits();
  const searchParams = useSearchParams();
  const centsPerCredit = info?.centsPerCredit ?? 1;

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [pack, setPack] = useState<number | "custom" | null>(null);
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

  // Stripe returned after a top-up — refresh the balances and flash a banner.
  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      setShowTopupSuccess(true);
      refresh();
      refreshTelephony();
      const t = setTimeout(() => {
        refresh();
        refreshTelephony();
      }, 2500); // webhook may lag a moment
      return () => clearTimeout(t);
    }
  }, [searchParams, refresh, refreshTelephony]);

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

  const buyCredits = pack === "custom" ? Number(customCredits) || 0 : pack ?? 0;
  const canBuy = buyCredits >= minTopup && !checkoutBusy;

  async function checkout() {
    if (!canBuy) return;
    setCheckoutBusy(true);
    try {
      const url = await startCreditCheckout(buyCredits);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutBusy(false);
    }
  }

  const usage = info?.usageThisMonth;
  const low = balance > 0 && balance < 100;
  const empty = balance <= 0;

  return (
    <div className="space-y-5 max-w-4xl">
      {showTopupSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] bg-signal-green/10 border border-signal-green-text/20">
          <Check size={15} className="text-signal-green-text shrink-0" />
          <span className="text-[12px] text-ink-secondary">
            Top-up successful — your balance updates within a few seconds.
          </span>
        </div>
      )}

      {/* ── Wallets ── */}
      <div className={cn("grid grid-cols-1 gap-4", telephony && "lg:grid-cols-2")}>
        {/* Credit balance */}
        <div className="rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col">
          <div className={cn("flex items-center gap-1.5 mb-3", SECTION_LABEL)}>
            <Coins size={12} className="text-accent" /> Credit balance
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-[30px] font-semibold tabular-nums leading-none", empty ? "text-signal-red-text" : "text-ink")}>
              {loading && !info ? "—" : balance.toLocaleString()}
            </span>
            <span className="text-[12px] text-ink-muted">credits · {creditsToUsd(balance, centsPerCredit)}</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2">
            Powers enrichment and scraping. 1 credit = ${(centsPerCredit / 100).toFixed(2)} — credits never expire.
          </p>
          {(low || empty) && (
            <p className={cn("text-[11px] mt-2 font-medium", empty ? "text-signal-red-text" : "text-amber-600 dark:text-amber-400")}>
              {empty
                ? "You're out of credits — enrichment and scraping are paused until you top up."
                : "Running low — top up to avoid interruptions."}
            </p>
          )}
          <div className="mt-auto pt-4">
            <a
              href="#top-up"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={13} /> Top up
            </a>
          </div>
        </div>

        {/* Telephony balance */}
        {telephony && <TelephonyBalanceCard data={telephony} />}
      </div>

      {/* ── Top up ── */}
      <div id="top-up" className="rounded-[14px] border border-border-subtle bg-surface p-5 scroll-mt-20">
        <h3 className="text-[13px] font-semibold text-ink">Top up credits</h3>
        <p className="text-[11.5px] text-ink-muted mt-0.5 mb-4">
          Pick an amount and pay securely with Stripe — ${(centsPerCredit / 100).toFixed(2)} per credit, minimum {minTopup.toLocaleString()}.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {(info?.packs ?? []).map((p) => (
            <button
              key={p.credits}
              onClick={() => setPack(p.credits)}
              className={cn(
                "px-4 py-2.5 rounded-[12px] border text-left transition-colors",
                pack === p.credits
                  ? "border-accent bg-accent/10"
                  : "border-border-subtle bg-section/40 hover:bg-hover",
              )}
            >
              <div className={cn("text-[14px] font-semibold tabular-nums leading-none", pack === p.credits ? "text-accent" : "text-ink")}>
                {p.credits.toLocaleString()}
              </div>
              <div className="text-[10.5px] text-ink-muted mt-1 tabular-nums">
                ${p.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </button>
          ))}
          <button
            onClick={() => setPack("custom")}
            className={cn(
              "px-4 py-2.5 rounded-[12px] border text-left transition-colors",
              pack === "custom"
                ? "border-accent bg-accent/10"
                : "border-border-subtle bg-section/40 hover:bg-hover",
            )}
          >
            <div className={cn("text-[14px] font-semibold leading-none", pack === "custom" ? "text-accent" : "text-ink")}>Custom</div>
            <div className="text-[10.5px] text-ink-muted mt-1">any amount</div>
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {pack === "custom" && (
            <input
              inputMode="numeric"
              autoFocus
              value={customCredits}
              onChange={(e) => setCustomCredits(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={`min ${minTopup.toLocaleString()}`}
              className="w-36 bg-section border border-border-subtle rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default tabular-nums"
            />
          )}
          <button
            onClick={() => void checkout()}
            disabled={!canBuy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {checkoutBusy ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
            {buyCredits >= minTopup
              ? `Buy ${buyCredits.toLocaleString()} credits · ${creditsToUsd(buyCredits, centsPerCredit)}`
              : "Buy credits"}
          </button>
        </div>

        {/* What credits cost */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border-subtle">
          {[
            { icon: Phone, label: "Phone enrichment", cost: info?.costs.phone ?? 33, unit: "per number found" },
            { icon: Mail, label: "Email enrichment", cost: info?.costs.email ?? 3, unit: "per email found" },
            { icon: Briefcase, label: "Job scraping", cost: info?.costs.job ?? 1, unit: "per job found" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-section border border-border-subtle flex items-center justify-center shrink-0">
                <c.icon size={12} className="text-ink-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-ink truncate">{c.label}</p>
                <p className="text-[10.5px] text-ink-muted tabular-nums">
                  {c.cost} credit{c.cost === 1 ? "" : "s"} {c.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Telephony budget + auto top-up ── */}
      {telephony && <TelephonySettingsCard data={telephony} onRefresh={refreshTelephony} />}

      {/* ── History ── */}
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

        {/* This month at a glance */}
        <div className="grid grid-cols-4 divide-x divide-border-subtle border-b border-border-subtle bg-section/30">
          <MonthStat label="Spent this month" value={(usage?.totalSpent ?? 0).toLocaleString()} sub={creditsToUsd(usage?.totalSpent ?? 0, centsPerCredit)} />
          <MonthStat label="Phones found" value={`${usage?.phoneEnrichment.quantity ?? 0}`} sub={`${Math.abs(usage?.phoneEnrichment.credits ?? 0).toLocaleString()} cr`} />
          <MonthStat label="Emails found" value={`${usage?.emailEnrichment.quantity ?? 0}`} sub={`${Math.abs(usage?.emailEnrichment.credits ?? 0).toLocaleString()} cr`} />
          <MonthStat label="Jobs scraped" value={`${usage?.jobScraping.quantity ?? 0}`} sub={`${Math.abs(usage?.jobScraping.credits ?? 0).toLocaleString()} cr`} />
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

function MonthStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-5 py-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-faint font-medium">{label}</p>
      <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">
        {value} <span className="text-[10.5px] font-normal text-ink-muted">{sub}</span>
      </p>
    </div>
  );
}

const MONEY_INPUT_CLASS =
  "w-28 bg-section border border-border-subtle rounded-[8px] pl-6 pr-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default tabular-nums";

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
          "absolute left-0 top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Read-only telephony wallet summary: balance, what it means, and this
 *  month's spend against the budget (if one is set). */
function TelephonyBalanceCard({ data }: { data: TelephonyCredits }) {
  const currency = (data.currency || "usd").toUpperCase();
  const fmt = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
  const owing = data.balanceMinor < 0;
  // Defensive defaults — never crash the tab over a deploy-skew response shape.
  const budget = data.budget ?? { period: "", limitMinor: null, spentMinor: 0, blocked: false };
  const autoTopup = data.autoTopup ?? { enabled: false, thresholdMinor: 0, targetMinor: 0, lastError: null };
  const spentPct = budget.limitMinor ? Math.min(100, (budget.spentMinor / budget.limitMinor) * 100) : 0;

  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface p-5 flex flex-col">
      <div className={cn("flex items-center gap-1.5 mb-3", SECTION_LABEL)}>
        <Phone size={12} className="text-accent" /> Telephony balance
        {owing && (
          <span className="text-[9px] uppercase tracking-wide font-semibold text-signal-red-text bg-signal-red/15 px-1.5 py-0.5 rounded-full">
            Owing
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-[30px] font-semibold tabular-nums leading-none", owing ? "text-signal-red-text" : "text-ink")}>
          {fmt(data.balanceMinor)}
        </span>
        {owing && !autoTopup.enabled && (
          <span className="text-[12px] text-ink-muted tabular-nums">
            next invoice ≈ {fmt(Math.round(Math.abs(data.balanceMinor) * (1 + data.bufferPct / 100)))}
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink-muted mt-2">
        Calls, texts and phone-number rental draw this down;{" "}
        {autoTopup.enabled
          ? "auto top-up recharges it from your saved card."
          : `paying your telephony invoice (usage + a ${data.bufferPct}% calling buffer) tops it back up.`}
      </p>

      <div className="mt-auto pt-4">
        <div className="flex items-baseline justify-between text-[11px] tabular-nums">
          <span className="text-ink-secondary">
            <span className="font-medium text-ink">{fmt(budget.spentMinor)}</span> used this month
          </span>
          <span className="text-ink-faint">{budget.limitMinor ? `${fmt(budget.limitMinor)} budget` : "no budget set"}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-section overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              !budget.limitMinor ? "bg-border-default" : spentPct >= 100 ? "bg-signal-red-text" : spentPct >= 80 ? "bg-amber-500" : "bg-signal-green-text",
            )}
            style={{ width: budget.limitMinor ? `${Math.max(spentPct, 1.5)}%` : "100%", opacity: budget.limitMinor ? 1 : 0.35 }}
          />
        </div>
        {budget.blocked && (
          <p className="text-[11px] font-medium text-signal-red-text mt-1.5">
            Budget reached — outbound calls and texts are paused.
          </p>
        )}
      </div>
    </div>
  );
}

/** Monthly spending limit + auto top-up settings (Close-style). */
function TelephonySettingsCard({ data, onRefresh }: { data: TelephonyCredits; onRefresh: () => void }) {
  const currency = (data.currency || "usd").toUpperCase();
  const fmt = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
  const budget = data.budget ?? { period: "", limitMinor: null, spentMinor: 0, blocked: false };
  const autoTopup = data.autoTopup ?? { enabled: false, thresholdMinor: 0, targetMinor: 0, lastError: null };

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
  const [topupDraft, setTopupDraft] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  const toMinor = (s: string) => Math.round((parseFloat(s) || 0) * 100);
  // What the FIRST auto charge would be if enabled right now (covers any
  // outstanding negative balance up to the target).
  const firstChargeMinor = Math.min(Math.max(0, toMinor(targetDraft) - data.balanceMinor), 1_000_000);

  async function topupNow() {
    const amountMinor = toMinor(topupDraft);
    if (toppingUp || amountMinor < 500) return;
    setToppingUp(true);
    setNotice(null);
    try {
      const res = await telephonyTopupNow(amountMinor);
      if ("checkoutUrl" in res) {
        // No saved card — pay via Stripe Checkout (which saves the card).
        window.location.href = res.checkoutUrl;
        return;
      }
      setNotice({
        tone: "ok",
        text:
          res.settledInvoices.length > 0
            ? `Charged ${fmt(amountMinor)} — invoice${res.settledInvoices.length === 1 ? "" : "s"} ${res.settledInvoices.join(", ")} settled. New balance ${fmt(res.balanceMinor)}.`
            : `Charged ${fmt(amountMinor)} — new balance ${fmt(res.balanceMinor)}.`,
      });
      setTopupDraft("");
      onRefresh();
    } catch (err) {
      setNotice({ tone: "err", text: err instanceof Error ? err.message : "Top-up failed" });
    } finally {
      setToppingUp(false);
    }
  }

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
      <h3 className="text-[13px] font-semibold text-ink">Telephony controls</h3>
      <p className="text-[11.5px] text-ink-muted mt-0.5 mb-4">
        Keep calling and texting within budget, and never run dry mid-campaign.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {/* Monthly spending limit */}
        <div>
          <p className={cn("mb-1", SECTION_LABEL)}>Monthly spending limit</p>
          <p className="text-[11px] text-ink-muted mb-2.5 min-h-[45px]">
            When the month&apos;s usage reaches this amount, outbound calls and SMS pause until the
            next month. Leave empty for no limit.
          </p>
          <div className="flex items-center gap-2">
            <MoneyInput value={limitDraft} onChange={setLimitDraft} placeholder="No limit" />
            <span className="text-[11px] text-ink-faint">per month</span>
          </div>
        </div>

        {/* Auto top-up */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className={SECTION_LABEL}>Auto top-up</p>
            <Toggle on={atEnabled} onChange={setAtEnabled} disabled={saving} />
          </div>
          <p className="text-[11px] text-ink-muted mb-2.5 min-h-[45px]">
            Automatically recharge your balance from your saved card. While enabled, telephony is
            billed through these charges instead of monthly invoices.
          </p>
          {atEnabled && (
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className={cn("mb-1.5 block", SECTION_LABEL)}>When balance goes below</label>
                <MoneyInput value={thresholdDraft} onChange={setThresholdDraft} placeholder="25" />
              </div>
              <div>
                <label className={cn("mb-1.5 block", SECTION_LABEL)}>Recharge to</label>
                <MoneyInput value={targetDraft} onChange={setTargetDraft} placeholder="200" />
              </div>
            </div>
          )}
          {atEnabled && data.balanceMinor < 0 && toMinor(targetDraft) > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
              Your balance is {fmt(data.balanceMinor)}, so the first charge will be ≈{" "}
              <span className="font-medium">{fmt(firstChargeMinor)}</span> — it clears your
              outstanding usage and any open telephony invoices it covers.
            </p>
          )}
          {autoTopup.lastError && atEnabled && (
            <p className="text-[11px] font-medium text-signal-red-text mt-2">
              Last top-up attempt failed: {autoTopup.lastError}
            </p>
          )}
        </div>
      </div>

      {/* ── One-off top-up ── */}
      <div className="mt-5 pt-4 border-t border-border-subtle">
        <p className={cn("mb-1", SECTION_LABEL)}>One-off top-up</p>
        <p className="text-[11px] text-ink-muted mb-2.5 max-w-[560px]">
          Charge your saved card once, right now. The amount is added to your balance and any open
          telephony invoices it covers are settled automatically, oldest first.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <MoneyInput value={topupDraft} onChange={setTopupDraft} placeholder="100" disabled={toppingUp} />
          <button
            onClick={() => void topupNow()}
            disabled={toppingUp || toMinor(topupDraft) < 500}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {toppingUp ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {toMinor(topupDraft) >= 500 ? `Top up ${fmt(toMinor(topupDraft))}` : "Top up"}
          </button>
          <span className="text-[10.5px] text-ink-faint">min {fmt(500)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
        {notice && (
          <p className={cn("text-[11.5px]", notice.tone === "err" ? "text-signal-red-text font-medium" : "text-signal-green-text")}>
            {notice.text}
          </p>
        )}
        <button
          onClick={() => void save()}
          disabled={saving || (atEnabled && (toMinor(targetDraft) <= toMinor(thresholdDraft) || toMinor(targetDraft) <= 0))}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save settings
        </button>
      </div>
    </div>
  );
}
