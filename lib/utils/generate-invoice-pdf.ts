import type { StripeInvoice } from "@/lib/types/billing";

/**
 * Generate a branded invoice HTML and trigger browser print/save as PDF.
 */
export function downloadInvoiceAsPdf(invoice: StripeInvoice, companyName: string) {
  const amount = ((invoice.amountPaid || invoice.amountDue) / 100).toFixed(2);
  const date = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const periodStart = invoice.periodStart
    ? new Date(invoice.periodStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const periodEnd = invoice.periodEnd
    ? new Date(invoice.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.number || ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .logo span { color: #3b82f6; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 28px; font-weight: 300; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .invoice-meta p { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .invoice-meta .number { font-size: 14px; color: #1a1a1a; font-weight: 600; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { }
    .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; font-weight: 600; margin-bottom: 8px; }
    .party-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #6b7280; line-height: 1.5; }
    .divider { height: 1px; background: #e5e7eb; margin: 0 0 32px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    th:last-child { text-align: right; }
    td { padding: 16px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    td:last-child { text-align: right; font-weight: 600; }
    .total-row { border-top: 2px solid #1a1a1a; }
    .total-row td { padding-top: 16px; font-size: 16px; font-weight: 700; border-bottom: none; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .status { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-due { background: #fef3c7; color: #92400e; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Leadey<span>.</span></div>
    <div class="invoice-meta">
      <h2>Invoice</h2>
      <p class="number">${invoice.number || ""}</p>
      <p>Issued: ${date}</p>
      <p>Period: ${periodStart} — ${periodEnd}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">Leadey Ltd</div>
      <div class="party-detail">London, United Kingdom</div>
      <div class="party-detail">billing@leadey.io</div>
    </div>
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${companyName}</div>
    </div>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Leadey Subscription
          <br><span style="font-size: 11px; color: #6b7280;">${periodStart} — ${periodEnd}</span>
        </td>
        <td>&pound;${amount}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td>&pound;${amount}</td>
      </tr>
    </tbody>
  </table>

  <p style="margin-bottom: 8px;">
    <span class="status ${invoice.status === "paid" ? "status-paid" : "status-due"}">${invoice.status === "paid" ? "Paid" : "Due"}</span>
  </p>

  <div class="footer">
    <p>Thank you for your business.</p>
    <p>Leadey Ltd &middot; London, United Kingdom &middot; leadey.io</p>
  </div>
</body>
</html>`;

  // Open in new window and trigger print
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Small delay to ensure styles are loaded
    setTimeout(() => printWindow.print(), 300);
  }
}
