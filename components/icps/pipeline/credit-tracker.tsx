import { CreditUsageBar } from "@/components/icps/dashboard/credit-usage-bar";

interface CreditTrackerProps {
  used: number;
  total: number;
}

export function CreditTracker({ used, total }: CreditTrackerProps) {
  return <CreditUsageBar used={used} total={total} />;
}
