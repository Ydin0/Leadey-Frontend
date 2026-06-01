import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TrialBanner } from "@/components/layout/trial-banner";
import { CallProvider } from "@/components/calling/call-context";
import { AuthTokenSync } from "@/components/providers/auth-token-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthTokenSync>
      <CallProvider>
        {/* dashboard-backdrop applies the layered radial gradients per
            the Figma reference. The class is no-op in light mode. */}
        <div className="min-h-screen dashboard-backdrop bg-page">
          <Sidebar />
          <Header />
          <main className="ml-[56px] mt-14">
            <TrialBanner />
            <div className="p-6">{children}</div>
          </main>
        </div>
      </CallProvider>
    </AuthTokenSync>
  );
}
