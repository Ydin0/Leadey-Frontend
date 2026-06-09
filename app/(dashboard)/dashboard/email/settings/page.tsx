import { Settings } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailSettingsPage() {
  return (
    <EmailComingSoon
      icon={Settings}
      title="Settings"
      subtitle="Workspace-wide defaults applied to new campaigns, plus billing and integrations."
      feature="Settings"
    />
  );
}
