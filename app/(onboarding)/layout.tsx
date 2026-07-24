import { QueryProvider } from "@/components/providers/query-provider";
import { AuthTokenSync } from "@/components/providers/auth-token-sync";

/**
 * Minimal chrome for post-signup onboarding screens (the payment wall). Provides
 * the React Query client + Clerk→backend token sync — same as the dashboard —
 * but no sidebar/header, so the wall is a focused full-screen step.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthTokenSync>
        <div className="min-h-screen dashboard-backdrop bg-page">{children}</div>
      </AuthTokenSync>
    </QueryProvider>
  );
}
