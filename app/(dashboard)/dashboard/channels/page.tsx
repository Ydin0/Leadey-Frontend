import { Radio } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function ChannelsPage() {
  return (
    <ComingSoon
      icon={Radio}
      title="Channels"
      description="Manage your outreach channels and integrations. Channel configuration is available in Settings."
    />
  );
}
