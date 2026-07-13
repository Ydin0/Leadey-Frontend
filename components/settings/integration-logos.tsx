import { CalendarDays, Video, Sparkles, Linkedin, type LucideIcon } from "lucide-react";

export type IntegrationKey = "calendly" | "linkedin" | "fathom" | "fireflies";

/** Brand tile (real brand colour + representative glyph) for each integration. */
const BRAND: Record<IntegrationKey, { bg: string; icon: LucideIcon; fg?: string }> = {
  calendly: { bg: "#006BFF", icon: CalendarDays },
  linkedin: { bg: "#0A66C2", icon: Linkedin },
  fathom: { bg: "#4356E0", icon: Video },
  fireflies: { bg: "#F5A623", icon: Sparkles, fg: "#1A1205" },
};

export function IntegrationLogo({ provider, size = 42 }: { provider: IntegrationKey; size?: number }) {
  const b = BRAND[provider];
  const Icon = b.icon;
  return (
    <span
      className="flex items-center justify-center rounded-[12px] shrink-0 shadow-sm"
      style={{ background: b.bg, width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} style={{ color: b.fg || "#FFFFFF" }} />
    </span>
  );
}
