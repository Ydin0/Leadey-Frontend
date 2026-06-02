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

/** The "LEADEY" wordmark only (no chevron), inline-rendered with
 *  `currentColor` so it stays crisp at any size and adapts to the theme.
 *  Paths are lifted from logomark-white.svg, cropped to the letterforms. */
export function LeadeyWordmark({
  className,
  height = 16,
  title = "Leadey",
}: {
  className?: string;
  height?: number;
  title?: string;
}) {
  // Letters span x≈487–1709 in the 309-tall logomark coordinate space.
  const width = Math.round(height * (1228 / 309));
  return (
    <svg
      width={width}
      height={height}
      viewBox="485 0 1228 309"
      fill="currentColor"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <path d="M793.548 88.3975H706.907V140.613H784.91V165.54H706.907L706.965 220.641V246.355H678.638V165.54L706.907 140.613L678.638 98.9139V62.6841H793.548V88.3975Z" />
      <path d="M793.548 246.355H706.965V220.641H793.548V246.355Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M1038.87 246.355H1013.22L998.559 204.373H940.043L920.294 181.02L912.195 204.373H912.18L897.26 246.355H871.608L937.308 62.6841H973.168L1038.87 246.355ZM920.294 181.02H990.183L957.202 88.3975H953.013L920.294 181.02Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M1186.55 62.6841C1204 62.6841 1219.53 66.2698 1233.14 73.4416C1246.75 80.6135 1257.39 91.1095 1265.07 104.929C1272.75 118.748 1276.59 135.278 1276.59 154.519C1276.59 173.761 1272.84 190.291 1265.33 204.11C1257.83 217.755 1247.27 228.251 1233.66 235.597C1220.05 242.769 1204.34 246.355 1186.55 246.355H1177.94L1150.16 220.116L1149.7 246.355H1121.89V62.6841H1186.55ZM1150.16 220.116H1186.02C1199.28 220.116 1210.63 217.23 1220.05 211.457C1229.47 205.685 1236.54 197.813 1241.25 187.842C1245.96 177.872 1248.32 166.764 1248.32 154.519C1248.32 142.275 1245.96 131.167 1241.25 121.197C1236.54 111.051 1229.47 103.092 1220.05 97.3192C1210.63 91.3717 1199.28 88.3975 1186.02 88.3975H1150.16V220.116Z" />
      <path d="M1631.38 140.876L1647.61 169.026V246.355H1619.34V167.114L1558.09 62.6841H1587.15L1631.38 140.876Z" />
      <path d="M1661.95 142.921H1632.56L1680.07 62.6841H1709.12L1661.95 142.921Z" />
      <path d="M516.135 62.6841L516.193 220.641L487.956 246.355H487.865V62.6841H516.135Z" />
      <path d="M602.776 246.355H516.193V220.641H602.776V246.355Z" />
      <path d="M1481.35 88.3977H1394.71V140.613H1472.72V165.54H1394.71L1394.77 220.642V246.355H1366.44V165.54L1394.71 140.613L1366.44 98.4514V62.6842H1481.35V88.3977Z" />
      <path d="M1481.35 246.355H1394.77V220.642H1481.35V246.355Z" />
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
