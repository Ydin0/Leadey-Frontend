"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ExternalLink, Printer } from "lucide-react";
import { LeadeyMark, LeadeyWordmark } from "@/components/brand/leadey-mark";
import { cn } from "@/lib/utils";

/** Common shape rendered by the Leadey invoice document — Leadey-issued
 *  invoices (telephony/seats) and reshaped Stripe subscription invoices
 *  both map onto it. */
export interface InvoiceDocData {
  number: string;
  type: string;
  status: string; // open | paid
  period?: string | null; // YYYY-MM
  periodLabel?: string | null; // preformatted range (Stripe invoices)
  currency: string;
  lineItems: { description: string; quantity: number; unit: string; amountMinor: number }[];
  subtotalMinor: number;
  totalMinor: number;
  paymentUrl: string | null;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  orgName: string;
  billingName: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  billingVat: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function periodLabel(period: string | null | undefined): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period ?? "—";
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const UNIT_LABEL: Record<string, string> = { min: "min", msg: "messages", line: "lines", seat: "seats" };
// Summary/discount lines carry no meaningful qty/rate columns.
const NO_RATE_UNITS = new Set(["period", "discount"]);

/** Full customer invoice view: action bar (back / status / pay / print) +
 *  the branded paper document, with print isolation so only the document
 *  lands on paper. */
export function InvoiceView({ inv }: { inv: InvoiceDocData }) {
  const router = useRouter();
  const money = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: inv.currency.toUpperCase() }).format(minor / 100);

  return (
    <div className="max-w-[880px] mx-auto">
      <style>{`@media print {
        body * { visibility: hidden; }
        #invoice-document, #invoice-document * { visibility: visible; }
        #invoice-document { position: absolute; left: 0; top: 0; width: 100%; }
      }`}</style>

      {/* Action bar — never printed */}
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <button
          onClick={() => router.push("/dashboard/settings?tab=billing")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
        >
          <ArrowLeft size={13} /> Billing
        </button>
        <span
          className={cn(
            "text-[10px] font-medium rounded-full px-2 py-0.5 capitalize",
            inv.status === "paid"
              ? "bg-signal-green text-signal-green-text"
              : inv.status === "void"
                ? "bg-signal-slate text-signal-slate-text"
                : "bg-signal-blue text-signal-blue-text",
          )}
        >
          {inv.status}
        </span>
        <div className="flex-1" />
        {inv.status === "open" && inv.paymentUrl && (
          <a
            href={inv.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:opacity-90 transition-opacity"
          >
            <CreditCard size={13} /> Pay invoice
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] border border-border-subtle text-[11px] font-medium text-ink-secondary hover:bg-hover transition-colors"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      {/* ── The invoice document — always LIGHT (paper), in both themes ── */}
      <div
        data-theme="light"
        id="invoice-document"
        className="bg-surface text-ink rounded-[14px] border border-border-subtle shadow-lg overflow-hidden print:border-0 print:shadow-none print:rounded-none"
      >
        {/* Brand band */}
        <div
          className="px-10 py-7 flex items-center justify-between"
          style={{
            backgroundColor: "#0C1122",
            backgroundImage:
              "radial-gradient(70% 60% at 100% 100%, rgba(151,164,214,0.18) 0%, rgba(151,164,214,0) 65%), linear-gradient(135deg, #0C1122 0%, #141A30 100%)",
          }}
        >
          <div className="flex items-center gap-2.5 text-white">
            <LeadeyMark size={24} />
            <LeadeyWordmark height={19} />
          </div>
          <div className="text-right">
            <div className="text-[20px] font-semibold tracking-[-0.01em] text-white">INVOICE</div>
            <div className="text-[12px] text-[#97A4D6] mt-0.5">{inv.number}</div>
          </div>
        </div>

        <div className="px-10 py-8">
          {/* Parties + dates */}
          <div className="flex flex-wrap justify-between gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted font-medium mb-1.5">From</div>
              <div className="text-[13px] font-semibold text-ink">Leadey</div>
              <div className="text-[11.5px] text-ink-secondary mt-0.5">AI-Powered Lead Infrastructure</div>
              <div className="text-[11.5px] text-ink-muted">leadey.ai</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted font-medium mb-1.5">Billed to</div>
              <div className="text-[13px] font-semibold text-ink">{inv.billingName || inv.orgName || "—"}</div>
              {inv.billingEmail && <div className="text-[11.5px] text-ink-muted mt-0.5">{inv.billingEmail}</div>}
              {inv.billingAddress && (
                <div className="text-[11.5px] text-ink-secondary mt-0.5 whitespace-pre-line">{inv.billingAddress}</div>
              )}
              {inv.billingVat && <div className="text-[11.5px] text-ink-muted mt-0.5">VAT {inv.billingVat}</div>}
            </div>
            <div className="text-right">
              <Meta label="Invoice date" value={fmtDate(inv.issuedAt)} />
              <Meta label="Due date" value={fmtDate(inv.dueAt)} />
              <Meta
                label={inv.type === "telephony" ? "Usage period" : "Billing period"}
                value={inv.periodLabel ?? periodLabel(inv.period)}
              />
            </div>
          </div>

          {/* Status stamp */}
          {inv.status !== "open" && (
            <div className="mt-6">
              <span
                className={
                  inv.status === "paid"
                    ? "inline-block text-[11px] font-semibold uppercase tracking-[0.14em] rounded-md border-2 border-signal-green-text text-signal-green-text px-3 py-1"
                    : "inline-block text-[11px] font-semibold uppercase tracking-[0.14em] rounded-md border-2 border-border-default text-ink-muted px-3 py-1"
                }
              >
                {inv.status === "paid" ? `Paid ${fmtDate(inv.paidAt)}` : "Void"}
              </span>
            </div>
          )}

          {/* Line items */}
          <div className="mt-8">
            <div className="grid grid-cols-[1fr_90px_110px_110px] gap-3 pb-2.5 border-b border-border-default">
              {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                <span
                  key={h}
                  className={`text-[10px] uppercase tracking-[0.08em] text-ink-muted font-semibold ${i > 0 ? "text-right" : ""}`}
                >
                  {h}
                </span>
              ))}
            </div>
            {inv.lineItems.map((li, i) => {
              const noRate = NO_RATE_UNITS.has(li.unit);
              const rate = !noRate && li.quantity > 0 ? li.amountMinor / li.quantity : null;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_90px_110px_110px] gap-3 py-3 border-b border-border-default"
                >
                  <span className="text-[12.5px] text-ink">{li.description}</span>
                  <span className="text-[12px] text-ink-secondary text-right">
                    {noRate ? "—" : `${li.quantity.toLocaleString()} ${UNIT_LABEL[li.unit] ?? li.unit}`}
                  </span>
                  <span className="text-[12px] text-ink-secondary text-right">
                    {rate !== null ? `${money(rate)}/${li.unit}` : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-[12.5px] font-medium text-right",
                      li.amountMinor < 0 ? "text-signal-green-text" : "text-ink",
                    )}
                  >
                    {money(li.amountMinor)}
                  </span>
                </div>
              );
            })}

            {/* Totals */}
            <div className="flex justify-end mt-5">
              <div className="w-[280px]">
                <div className="flex justify-between py-1.5 text-[12px] text-ink-secondary">
                  <span>Subtotal</span>
                  <span>{money(inv.subtotalMinor)}</span>
                </div>
                <div className="flex justify-between py-2.5 mt-1 border-t-2 border-ink text-[14px] font-semibold text-ink">
                  <span>{inv.status === "paid" ? "Total" : "Total due"}</span>
                  <span>{money(inv.totalMinor)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          {inv.paymentUrl && inv.status === "open" && (
            <div className="mt-7 rounded-[10px] bg-section px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted font-medium mb-1">Pay online</div>
              <a
                href={inv.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-signal-blue-text break-all underline inline-flex items-center gap-1"
              >
                {inv.paymentUrl} <ExternalLink size={11} className="shrink-0" />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-ink-muted">
              <LeadeyMark size={12} />
              <span className="text-[10.5px]">Leadey · Transforming lead generation</span>
            </div>
            <span className="text-[10.5px] text-ink-faint">
              {inv.number} · {money(inv.totalMinor)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-ink-muted font-medium mr-3">{label}</span>
      <span className="text-[12px] text-ink font-medium">{value}</span>
    </div>
  );
}
