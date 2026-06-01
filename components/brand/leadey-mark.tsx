import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Leadey double-chevron mark, inline-rendered so it inherits
 *  `currentColor` and scales without rasterising. Path is the canonical
 *  brand icon (see /public/logo/icon-white.svg). */
export function LeadeyMark({
  className,
  size = 20,
  title = "Leadey",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 301 309"
      fill="currentColor"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <path d="M66.2697 0L300.593 125.175V183.214L66.2697 308.389H0L119.978 162.424H249.917V145.964H119.978L0 0H66.2697Z" />
    </svg>
  );
}

/** Brand mark in its app-icon tile presentation — a rounded navy
 *  square with the chevron painted in a vertical periwinkle gradient.
 *  Matches Figma node 159:711 (the app icon used in the sidebar and
 *  social profile). */
export function LeadeyTileMark({
  className,
  size = 36,
  title = "Leadey",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  // Generate a unique gradient id per render so multiple instances on
  // the same page don't collide. The chevron viewBox is 301×309 — we
  // centre it inside a 600×600 frame with ~22% inset so it reads as a
  // proper app-icon mark rather than the bare shape.
  const id = `leadey-tile-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1B2347" />
          <stop offset="100%" stopColor="#0F1730" />
        </linearGradient>
        <linearGradient id={`${id}-mark`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#9FB1E8" />
        </linearGradient>
      </defs>
      {/* Tile background — rounded navy */}
      <rect width="100" height="100" rx="22" fill={`url(#${id}-bg)`} />
      {/* Chevron mark — scaled into the tile with ~22% padding */}
      <g transform="translate(22, 25)">
        <path
          d="M66.2697 0L300.593 125.175V183.214L66.2697 308.389H0L119.978 162.424H249.917V145.964H119.978L0 0H66.2697Z"
          transform="scale(0.187)"
          fill={`url(#${id}-mark)`}
        />
      </g>
    </svg>
  );
}

/** The full horizontal LEADEY logomark — chevron + wordmark. Served from
 *  the static SVG file so the licensed glyphs are reproduced exactly.
 *  Used only on the sign-in surface per the brand guide. */
export function LeadeyLogomark({
  className,
  height = 36,
  variant = "white",
  title = "Leadey",
}: {
  className?: string;
  height?: number;
  variant?: "white" | "color";
  title?: string;
}) {
  const src =
    variant === "color" ? "/logo/logomark-color.svg" : "/logo/logomark-white.svg";
  // 1710 × 309 native aspect ratio
  const width = Math.round(height * (1710 / 309));
  return (
    <Image
      src={src}
      alt={title}
      width={width}
      height={height}
      priority
      className={cn("shrink-0", className)}
    />
  );
}
