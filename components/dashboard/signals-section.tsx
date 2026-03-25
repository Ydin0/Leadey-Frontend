import { Sparkles } from "lucide-react";

export function SignalsSection() {
  return (
    <section className="sticky top-20">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-semibold text-ink">Signals</h2>
        <span className="text-[10px] font-medium bg-signal-blue text-signal-blue-text rounded-full px-2 py-0.5 leading-none">
          Coming Soon
        </span>
      </div>
      <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-section flex items-center justify-center mx-auto mb-3">
          <Sparkles size={20} strokeWidth={1.5} className="text-ink-muted" />
        </div>
        <h3 className="text-[13px] font-medium text-ink mb-1">Intent Signals</h3>
        <p className="text-[12px] text-ink-muted leading-relaxed max-w-[240px] mx-auto">
          Detect hiring surges, funding rounds, tech adoption, and buying intent across your target accounts.
        </p>
      </div>
    </section>
  );
}
