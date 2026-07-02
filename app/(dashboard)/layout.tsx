import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TrialBanner } from "@/components/layout/trial-banner";
import { CallProvider } from "@/components/calling/call-context";
import { IncomingCallPrompt } from "@/components/calling/incoming-call-prompt";
import { VersionGate } from "@/components/providers/version-gate";
import { DialerProvider } from "@/components/dialer/context/dialer-context";
import { DialerBar } from "@/components/dialer/bar/dialer-bar";
import { AuthTokenSync } from "@/components/providers/auth-token-sync";
import { QueryProvider } from "@/components/providers/query-provider";
import { ScraperRunsProvider } from "@/components/providers/scraper-runs-provider";
import { CreditsProvider } from "@/components/providers/credits-provider";
import { ScraperRunsWidget } from "@/components/scrapers/scraper-runs-widget";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
    <AuthTokenSync>
      <CreditsProvider>
      <CallProvider>
        <DialerProvider>
          <ScraperRunsProvider>
            {/* dashboard-backdrop applies the layered radial gradients per
                the Figma reference. The class is no-op in light mode. */}
            <div className="min-h-screen dashboard-backdrop bg-page">
              <Sidebar />
              <Header />
              {/* Fixed-height app shell: the header/sidebar are fixed, the
                  dialer + trial bars pin to the top of main, and only the
                  content area scrolls. This keeps full-height views (e.g. the
                  lead profile) flush to the viewport instead of overflowing
                  past the bottom. */}
              <main className="ml-[56px] mt-14 h-[calc(100vh-3.5rem)] flex flex-col">
                {/* Persistent power-dialer bar — only renders while a session
                    is running. Pinned above the scroll area. */}
                <DialerBar />
                <TrialBanner />
                <div className="flex-1 min-h-0 overflow-y-auto p-6">{children}</div>
              </main>
              <ScraperRunsWidget />
              {/* AI assistant — floating launcher (bottom-right) + chat panel. */}
              <AssistantWidget />
              {/* Global ringing prompt for inbound calls (accept/reject). */}
              <IncomingCallPrompt />
              {/* Auto-reloads stale tabs so reps never run outdated call code. */}
              <VersionGate />
            </div>
          </ScraperRunsProvider>
        </DialerProvider>
      </CallProvider>
      </CreditsProvider>
    </AuthTokenSync>
    </QueryProvider>
  );
}
