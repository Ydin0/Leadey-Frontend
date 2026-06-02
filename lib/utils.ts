import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/** Format an E.164 / international number for display.
 *  Groups the national digits so "+447576550311" → "+44 7576 550311" and
 *  "+12015550123" → "+1 (201) 555-0123". Falls back to a lightly-grouped
 *  rendering for country codes we don't special-case. */
export function formatPhoneIntl(phone: string): string {
  if (!phone) return "";
  const raw = phone.trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  // US / Canada (+1)
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10 && !hasPlus) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // UK (+44) — typical mobile is 11 national digits after the country code
  if (hasPlus && digits.startsWith("44")) {
    const rest = digits.slice(2);
    return `+44 ${rest.slice(0, 4)} ${rest.slice(4)}`.trim();
  }

  // Generic international: keep the country code, group the rest in 3s.
  if (hasPlus) {
    const cc = digits.length > 10 ? digits.slice(0, 2) : digits.slice(0, 1);
    const rest = digits.slice(cc.length);
    const groups = rest.match(/.{1,3}/g) || [rest];
    return `+${cc} ${groups.join(" ")}`.trim();
  }

  return raw;
}

/** Compact currency for opportunity values, stats cards, etc.
 *  Drops cents for whole numbers and uses k/M suffixes when compact=true. */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  options?: { compact?: boolean },
): string {
  if (!Number.isFinite(amount)) return "—";
  if (options?.compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) {
      const v = amount / 1_000_000;
      return `${formatCurrencyBase(0, currency)}${(Math.round(v * 10) / 10).toFixed(1)}M`.replace(/0\.0/, "0");
    }
    if (abs >= 1_000) {
      const v = amount / 1_000;
      return `${formatCurrencyBase(0, currency)}${Math.round(v)}k`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCurrencyBase(amount: number, currency: string): string {
  // Strips the digits so we can prefix the symbol manually for compact form.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[0-9]/g, "")
    .trim();
}
