import { LeadeyLogomark, LeadeyMark } from "@/components/brand/leadey-mark";

/**
 * Auth shell — split layout per Leadey_Brand_Style_Guide §11.8:
 *   - Left  (60%): cinematic brand panel, dark gradient, full logomark,
 *                   tagline, onboarding chevrons.
 *   - Right (40%): functional form panel housing the existing sign-in /
 *                   sign-up form (which is rendered as {children}).
 *
 * On narrow viewports the brand panel collapses out so the form remains
 * fully usable on mobile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[3fr_2fr] bg-[#0C1122]">
      {/* ── Brand panel ────────────────────────────────────────────── */}
      <section
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16"
        style={{
          // The cinematic "Leadey Horizon" gradient — radial light falling
          // from the upper-right onto deep midnight (brand guide §5.1).
          background:
            "radial-gradient(120% 100% at 80% 0%, #4A5478 0%, #242E55 22%, #192039 55%, #0C1122 100%)",
        }}
      >
        {/* Ambient glow halo — periwinkle, blurred. §5.1 "Ambient Glow". */}
        <div
          aria-hidden
          className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(151,164,214,0.45) 0%, rgba(151,164,214,0) 70%)",
          }}
        />
        {/* Subtle grid texture — geometry references the brand's
            precision principle without overwhelming the gradient. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Top — full logomark */}
        <div className="relative z-10">
          <LeadeyLogomark height={32} className="opacity-95" />
        </div>

        {/* Centre — brand statement */}
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.04] text-[11px] tracking-[0.12em] uppercase text-white/70 mb-8">
            AI-Powered Lead Infrastructure
          </p>
          <h1 className="font-display text-[44px] xl:text-[56px] leading-[1.05] tracking-[-0.02em] font-light text-white">
            Transforming lead generation through intelligent systems.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-[#97A4D6] max-w-md">
            AI systems designed to source, qualify, and reach the right
            people — automatically.
          </p>
        </div>

        {/* Bottom — onboarding promise list. Chevron bullets per §11.8. */}
        <div className="relative z-10 grid grid-cols-3 gap-6 max-w-2xl">
          <Step label="Connect your audience" />
          <Step label="Connect your channels" />
          <Step label="Launch your outreach" />
        </div>
      </section>

      {/* ── Form panel ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center p-6 sm:p-10 bg-[#0C1122] border-l border-white/[0.06]">
        {/* Compact mark for mobile (brand panel is hidden < lg) */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5 text-white">
          <LeadeyMark size={24} />
          <span className="font-display text-[18px] font-light tracking-[0.18em] uppercase">
            Leadey
          </span>
        </div>

        <div className="w-full max-w-[400px]">{children}</div>

        <p className="mt-10 text-[11px] text-white/40 text-center">
          © {new Date().getFullYear()} Leadey · Transforming lead generation
        </p>
        <div id="clerk-captcha" />
      </section>
    </div>
  );
}

function Step({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-[2px] text-white/80">
        <LeadeyMark size={11} />
      </span>
      <span className="text-[12px] leading-[1.4] text-white/80">{label}</span>
    </div>
  );
}
