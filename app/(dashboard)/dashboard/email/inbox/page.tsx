import { Inbox } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailInboxPage() {
  return (
    <EmailComingSoon
      icon={Inbox}
      title="Master Inbox"
      subtitle="Every reply across all client mailboxes in one place. Triage, label, and route to the right teammate."
      feature="Master Inbox"
    />
  );
}
