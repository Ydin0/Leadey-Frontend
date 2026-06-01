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
