import { LeadeyLogomark, LeadeyMark } from "@/components/brand/leadey-mark";

/**
 * Auth shell — cinematic split layout aligned with the dashboard
 * gradient system. Always dark regardless of system theme (sign-in is
 * a brand surface, not a product surface).
 *
 *   - Left  (≥ lg, 60%): the cinematic brand panel — layered radial
 *                         gradients that mirror the dashboard backdrop,
 *                         large LEADEY logomark, brand statement,
 *                         onboarding chevron bullets.
 *   - Right (40%):        minimal form panel hosting Clerk's sign-in /
 *                         sign-up form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Force dark tokens inside the auth shell so the AuthCard (which uses
    // bg-surface / text-ink etc.) reads correctly against the cinematic
    // dark panel, regardless of the user's preferred theme.
    <div
      data-theme="dark"
      className="min-h-screen lg:grid lg:grid-cols-[3fr_2fr] bg-[#070A19]"
    >
      {/* ── Brand panel ────────────────────────────────────────────── */}
      <section
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16"
        style={{
          // Layered horizon — same four-radial recipe as the dashboard
          // backdrop, tuned a touch deeper for the auth context.
          backgroundColor: "#070A19",
          backgroundImage: [
            "radial-gradient(80% 80% at 18% 100%, rgba(151, 164, 214, 0.28) 0%, rgba(151, 164, 214, 0) 60%)",
            "radial-gradient(70% 60% at 100% 0%, rgba(74, 84, 120, 0.35) 0%, rgba(74, 84, 120, 0) 65%)",
            "radial-gradient(60% 60% at 100% 100%, rgba(35, 46, 85, 0.45) 0%, rgba(35, 46, 85, 0) 70%)",
            "linear-gradient(135deg, #070A19 0%, #0C1122 35%, #141A30 65%, #1A2347 100%)",
          ].join(", "),
        }}
      >
        {/* Diffuse periwinkle halo, bottom-left. */}
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 w-[680px] h-[680px] rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(151,164,214,0.40) 0%, rgba(151,164,214,0) 70%)",
          }}
        />
        {/* Secondary highlight, upper-right, more periwinkle. */}
        <div
          aria-hidden
          className="absolute -top-24 right-12 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(200,207,230,0.45) 0%, rgba(200,207,230,0) 70%)",
          }}
        />
        {/* Subtle precision grid. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Top — full LEADEY logomark, the brand identity at full size. */}
        <div className="relative z-10">
          <LeadeyLogomark height={36} className="opacity-95" />
        </div>

        {/* Centre — brand statement. */}
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-sm text-[11px] tracking-[0.16em] uppercase text-white/70 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#97A4D6] shadow-[0_0_8px_rgba(151,164,214,0.8)]" />
            AI-Powered Lead Infrastructure
          </p>
          <h1 className="text-[40px] xl:text-[56px] leading-[1.05] tracking-[-0.02em] font-medium text-white">
            Transforming lead generation through{" "}
            <span className="bg-gradient-to-r from-white via-[#C8CFE6] to-[#97A4D6] bg-clip-text text-transparent">
              intelligent systems.
            </span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-[#97A4D6] max-w-md">
            AI systems designed to source, qualify, and reach the right
            people — automatically.
          </p>
        </div>

        {/* Bottom — onboarding promise. Chevron bullets per brand guide. */}
        <div className="relative z-10 grid grid-cols-3 gap-6 max-w-2xl">
          <Step label="Connect your audience" />
          <Step label="Connect your channels" />
          <Step label="Launch your outreach" />
        </div>
      </section>

      {/* ── Form panel ─────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center px-6 py-10 sm:px-10 min-h-screen"
        style={{
          backgroundColor: "#0C1122",
          backgroundImage: [
            "radial-gradient(70% 50% at 50% 100%, rgba(151, 164, 214, 0.10) 0%, rgba(151, 164, 214, 0) 70%)",
            "linear-gradient(180deg, #0C1122 0%, #0A0E1F 100%)",
          ].join(", "),
        }}
      >
        {/* Soft inner edge on the boundary between the two panels. */}
        <div
          aria-hidden
          className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.02] via-white/[0.08] to-white/[0.02] pointer-events-none"
        />

        {/* Mobile-only brand mark above the form. */}
        <div className="lg:hidden mb-10">
          <LeadeyLogomark height={28} />
        </div>

        <div className="w-full max-w-[400px] relative z-10">{children}</div>

        <p className="mt-10 text-[11px] text-white/40 text-center relative z-10">
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
      <span className="mt-[3px] text-white/90 shrink-0">
        <LeadeyMark size={11} />
      </span>
      <span className="text-[12px] leading-[1.45] text-white/80">{label}</span>
    </div>
  );
}
