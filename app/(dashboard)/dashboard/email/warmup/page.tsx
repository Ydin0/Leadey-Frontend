import { Flame } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailWarmupPage() {
  return (
    <EmailComingSoon
      icon={Flame}
      title="Warmup"
      subtitle="Leadey sends and replies to warmup emails from a private network, training inbox providers to trust your accounts."
      feature="Warmup"
    />
  );
}
