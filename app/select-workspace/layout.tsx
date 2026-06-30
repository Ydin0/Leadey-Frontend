import { LeadeyLogomark } from "@/components/brand/leadey-mark";

/** Workspace-chooser shell — a brand surface (always dark, like the auth pages),
 *  centered, with the same cinematic gradient backdrop as the dashboard. */
export default function SelectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="dark"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden"
      style={{
        backgroundColor: "#070A19",
        backgroundImage: [
          "radial-gradient(70% 60% at 50% 0%, rgba(74, 84, 120, 0.30) 0%, rgba(74, 84, 120, 0) 65%)",
          "radial-gradient(60% 60% at 50% 100%, rgba(151, 164, 214, 0.18) 0%, rgba(151, 164, 214, 0) 70%)",
          "linear-gradient(180deg, #070A19 0%, #0C1122 60%, #0A0E1F 100%)",
        ].join(", "),
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="relative z-10 mb-8">
        <LeadeyLogomark height={30} className="opacity-95" />
      </div>
      <div className="relative z-10 w-full max-w-[440px]">{children}</div>
    </div>
  );
}
