import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="card-brand bg-surface rounded-[16px] p-12 text-center max-w-lg mx-auto mt-12">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/8 bg-[rgba(151,164,214,0.08)]">
        <Icon size={22} strokeWidth={1.5} className="text-[#97A4D6]" />
      </div>
      <h2 className="font-display text-[20px] font-light tracking-[-0.01em] text-ink mb-2">
        {title}
      </h2>
      <span className="pill-periwinkle inline-block text-[10px] font-medium tracking-[0.08em] uppercase rounded-full px-2.5 py-0.5 mb-4">
        Coming Soon
      </span>
      <p className="text-[12px] text-ink-muted leading-[1.6] max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}
