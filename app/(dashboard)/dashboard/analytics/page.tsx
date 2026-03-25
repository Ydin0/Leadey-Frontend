import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Analytics Dashboard"
      description="Track outbound performance, conversion rates, and team productivity across all your funnels and channels."
    />
  );
}
