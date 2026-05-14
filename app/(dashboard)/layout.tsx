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
        <div className="min-h-screen bg-page">
          <TrialBanner />
          <Sidebar />
          <Header />
          <main className="ml-[56px] mt-14 p-6">{children}</main>
        </div>
      </CallProvider>
    </AuthTokenSync>
  );
}
