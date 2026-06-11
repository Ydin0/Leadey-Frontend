"use client";

import { cn } from "@/lib/utils";

/** The design system's team-member avatar palette — sophisticated two-tone
 *  gradients in varied hues (periwinkle, teal, violet, amber, rose, blue).
 *  Picked deterministically per member so each person keeps a stable colour
 *  everywhere they appear. Mirrors `Campaigns List.dc.html` exactly. */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #8C9AE0 0%, #6E7CC4 100%)", // periwinkle
  "linear-gradient(135deg, #6FBEA8 0%, #4E9C88 100%)", // teal
  "linear-gradient(135deg, #C58FD6 0%, #9D6CC0 100%)", // violet
  "linear-gradient(135deg, #E0A878 0%, #C08850 100%)", // amber
  "linear-gradient(135deg, #E08FA8 0%, #C06A88 100%)", // rose
  "linear-gradient(135deg, #7FA8D6 0%, #5E86C4 100%)", // blue
  "linear-gradient(135deg, #9B8FE0 0%, #6E5EC4 100%)", // indigo
  "linear-gradient(135deg, #6FBE9A 0%, #4E9C70 100%)", // emerald
];

function gradientFromId(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/** First initial of the first two words, e.g. "Alex Rivera" → "AR".
 *  Em-dashes (campaign-style names) are treated as separators. */
function initialsOf(name?: string): string {
  if (!name) return "";
  const parts = name.replace(/[—–-]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

const SIZES: Record<string, string> = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-6 h-6 text-[9px]",
  md: "w-8 h-8 text-[11px]",
  lg: "w-12 h-12 text-[15px]",
  xl: "w-14 h-14 text-[17px]",
};

interface MemberAvatarProps {
  id: string;
  name?: string;
  /** Explicit initials, when the caller only has them (not a full name).
   *  Falls back to deriving initials from `name`. */
  initials?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

/** Team-member avatar — a colourful gradient circle with the member's white
 *  initials. The single source of truth so avatars look identical everywhere
 *  (facepiles, filters, tables, timelines). Pass `border-2 border-page` via
 *  className + a negative margin for overlapping facepiles. */
export function MemberAvatar({ id, name, initials: initialsProp, size = "sm", className }: MemberAvatarProps) {
  const initials = initialsProp ?? initialsOf(name);
  return (
    <div
      title={name}
      style={{ backgroundImage: gradientFromId(id || name || "?") }}
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 overflow-hidden font-semibold text-white select-none",
        SIZES[size] ?? SIZES.sm,
        className,
      )}
    >
      {initials ? (
        <span className="leading-none">{initials}</span>
      ) : (
        <svg viewBox="0 0 24 24" fill="white" aria-hidden="true" className="w-[62%] h-[62%] translate-y-[8%]">
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M4.6 20c0-3.7 3.3-6.2 7.4-6.2S19.4 16.3 19.4 20z" />
        </svg>
      )}
    </div>
  );
}
