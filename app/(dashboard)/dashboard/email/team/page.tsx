import { UsersRound } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailTeamPage() {
  return (
    <EmailComingSoon
      icon={UsersRound}
      title="Team"
      subtitle="Bring your organization into campaigns, and allocate inboxes so each teammate manages their own threads."
      feature="Team"
    />
  );
}
