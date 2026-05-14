"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const avatarColors = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const sizeClasses = {
  sm: "w-5 h-5 text-[9px]",
  md: "w-7 h-7 text-[11px]",
  lg: "w-10 h-10 text-[14px]",
};

const imgSizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
};

interface CompanyAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  domain?: string;
  className?: string;
}

function logoUrl(domain: string): string {
  // Use Google's favicon service as primary (reliable, fast, free)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function CompanyAvatar({ name, size = "md", domain, className }: CompanyAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const colorIndex = name.charCodeAt(0) % avatarColors.length;
  const initial = name.charAt(0).toUpperCase();

  // Use explicit domain or derive from company name
  const effectiveDomain = domain || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

  if (!imgFailed) {
    return (
      <img
        src={logoUrl(effectiveDomain)}
        alt={name}
        onError={() => setImgFailed(true)}
        className={cn(
          "rounded-full object-cover shrink-0 bg-section",
          imgSizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-on-ink shrink-0",
        avatarColors[colorIndex],
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
