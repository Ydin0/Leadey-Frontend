import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OpportunitiesPage() {
  return (
    <ComingSoon
      icon={Briefcase}
      title="Opportunities Pipeline"
      description="Track deals through your pipeline stages, manage opportunity ownership, and forecast revenue across your team."
    />
  );
}
