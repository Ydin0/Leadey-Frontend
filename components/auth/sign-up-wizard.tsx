"use client";

import { useState } from "react";
import { AuthCard } from "./auth-card";
import { StepIndicator } from "@/components/shared/step-indicator";
import { StepCredentials } from "./steps/step-credentials";
import { StepVerifyEmail } from "./steps/step-verify-email";
import { StepCreateOrg } from "./steps/step-create-org";
import { StepInviteTeam } from "./steps/step-invite-team";

const STEPS = [
  { label: "Account" },
  { label: "Verify" },
  { label: "Organisation" },
  { label: "Team" },
];

const STEP_CONFIG = [
  { title: "Create your account", subtitle: "Get started with Leadey" },
  { title: "Verify your email", subtitle: "Check your inbox for a code" },
  { title: "Set up your organisation", subtitle: "Tell us about your company" },
  { title: "Invite your team", subtitle: "Collaborate with your colleagues" },
];

export function SignUpWizard() {
  const [step, setStep] = useState(0);

  function advance() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const config = STEP_CONFIG[step];

  return (
    <div className="w-full max-w-[400px] space-y-6">
      <div className="flex justify-center">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <AuthCard title={config.title} subtitle={config.subtitle}>
        {step === 0 && <StepCredentials onNext={advance} />}
        {step === 1 && <StepVerifyEmail onNext={advance} />}
        {step === 2 && <StepCreateOrg onNext={advance} />}
        {step === 3 && <StepInviteTeam />}
      </AuthCard>
    </div>
  );
}
