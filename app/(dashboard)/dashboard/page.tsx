import { RepliesSection } from "@/components/dashboard/replies-section";
import { LinkedInSection } from "@/components/dashboard/linkedin-section";
import { CallsSection } from "@/components/dashboard/calls-section";
import { EmailSection } from "@/components/dashboard/email-section";
import { SignalsSection } from "@/components/dashboard/signals-section";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left Column — Task Queue (3/5) */}
      <div className="col-span-3 flex flex-col gap-6">
        <RepliesSection />
        <LinkedInSection />
        <CallsSection />
        <EmailSection />
      </div>

      {/* Right Column — Signals (2/5) */}
      <div className="col-span-2">
        <SignalsSection />
      </div>
    </div>
  );
}
