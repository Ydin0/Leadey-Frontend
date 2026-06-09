import { FileText } from "lucide-react";
import { EmailComingSoon } from "@/components/email/coming-soon";

export default function EmailTemplatesPage() {
  return (
    <EmailComingSoon
      icon={FileText}
      title="Templates"
      subtitle="Reusable, tested copy with personalization tokens and spintax to keep every send unique."
      feature="Templates"
    />
  );
}
