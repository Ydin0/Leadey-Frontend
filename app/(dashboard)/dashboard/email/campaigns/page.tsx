import { Send } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailCampaignsPage() {
  return (
    <EmailComingSoon
      icon={Send}
      title="Campaigns"
      subtitle="Multi-step outbound sequences. Each runs across assigned mailboxes with its own schedule, leads, and team."
      feature="Campaigns"
    />
  );
}
