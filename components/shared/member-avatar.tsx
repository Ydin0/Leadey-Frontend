"use client";

import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-signal-blue text-signal-blue-text",
  "bg-signal-green text-signal-green-text",
  "bg-signal-red text-signal-red-text",
  "bg-signal-slate text-signal-slate-text",
];

function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

interface MemberAvatarProps {
  id: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function MemberAvatar({ id, name, size = "sm", className }: MemberAvatarProps) {
  const colorClass = getColorFromId(id);
  const initials = getInitials(name);

  return (
    <div
      title={name}
      className={cn(
        "rounded-full flex items-center justify-center font-medium shrink-0",
        colorClass,
        size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]",
        className
      )}
    >
      {initials}
    </div>
  );
}
