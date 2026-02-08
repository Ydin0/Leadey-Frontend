import { cn } from "@/lib/utils";
import type { SignalSource } from "@/lib/types/pipeline";

const sourceStyles: Record<SignalSource, { bg: string; text: string; label: string }> = {
  linkedin: { bg: "bg-[#0A66C2]", text: "text-white", label: "in" },
  indeed: { bg: "bg-[#2164F3]", text: "text-white", label: "iD" },
  twitter: { bg: "bg-[#000000]", text: "text-white", label: "\u{1D54F}" },
  reddit: { bg: "bg-[#FF4500]", text: "text-white", label: "r/" },
  instagram: { bg: "bg-[#E1306C]", text: "text-white", label: "ig" },
};

export function SourceBadge({ source }: { source: SignalSource }) {
  const style = sourceStyles[source];
  return (
    <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[8px] font-bold shrink-0", style.bg, style.text)}>
      {style.label}
    </span>
  );
}
