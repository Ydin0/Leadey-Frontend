import type { CountryOption } from "@/lib/types/calling";

export const countryOptions: CountryOption[] = [
  { code: "US", name: "United States", flag: "\u{1F1FA}\u{1F1F8}", availableTypes: ["local", "toll-free", "mobile"], bundleRequired: false },
  { code: "GB", name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}", availableTypes: ["local", "toll-free"], bundleRequired: false },
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}", availableTypes: ["local"], bundleRequired: true },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}", availableTypes: ["local", "mobile"], bundleRequired: true },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}", availableTypes: ["local", "mobile"], bundleRequired: true },
];
