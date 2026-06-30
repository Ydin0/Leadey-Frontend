"use client";

import { cn } from "@/lib/utils";

/** Organisation tile palette — same two-tone gradients as MemberAvatar, picked
 *  deterministically per org id so a workspace keeps a stable colour everywhere
 *  (switcher menu + workspace chooser). */
const ORG_GRADIENTS = [
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
  return ORG_GRADIENTS[Math.abs(hash) % ORG_GRADIENTS.length];
}

/** First initials of the workspace name, e.g. "Hyrra" → "HY", "Octogle Tech" → "OT". */
function initialsOf(name?: string): string {
  if (!name) return "?";
  const parts = name.replace(/[—–-]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIZES: Record<string, string> = {
  sm: "w-7 h-7 text-[10px] rounded-[7px]",
  md: "w-8 h-8 text-[11px] rounded-[8px]",
  lg: "w-11 h-11 text-[14px] rounded-[11px]",
  xl: "w-12 h-12 text-[15px] rounded-[12px]",
};

interface OrgAvatarProps {
  id: string;
  name?: string;
  /** Clerk org logo, when one has been uploaded. */
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/** Workspace/organisation avatar — a rounded-square logo, or a gradient tile
 *  with the org's initials when no logo is set. Square corners distinguish a
 *  workspace from the circular person avatar (MemberAvatar). */
export function OrgAvatar({ id, name, imageUrl, size = "md", className }: OrgAvatarProps) {
  const sizeCls = SIZES[size] ?? SIZES.md;
  // Clerk serves a generated default initials image when none is uploaded; only
  // use the image when it's a real logo (an uploaded file URL), else our tile.
  const hasLogo = !!imageUrl && /\.(png|jpe?g|gif|webp|svg)/i.test(imageUrl);

  if (hasLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl as string}
        alt={name || "Workspace"}
        title={name}
        className={cn("object-cover shrink-0 border border-border-subtle", sizeCls, className)}
      />
    );
  }

  return (
    <div
      title={name}
      style={{ backgroundImage: gradientFromId(id || name || "?") }}
      className={cn(
        "flex items-center justify-center shrink-0 font-semibold text-white select-none",
        sizeCls,
        className,
      )}
    >
      <span className="leading-none">{initialsOf(name)}</span>
    </div>
  );
}
