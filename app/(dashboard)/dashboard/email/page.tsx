import { LayoutDashboard } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailOverviewPage() {
  return (
    <EmailComingSoon
      icon={LayoutDashboard}
      title="Overview"
      subtitle="Everything your team is sending, landing, and booking — across every client campaign."
      feature="Overview"
    />
  );
}
