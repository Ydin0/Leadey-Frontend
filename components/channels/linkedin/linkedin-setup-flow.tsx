"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Linkedin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepIndicator } from "@/components/shared/step-indicator";
import { mockLinkedInAccounts } from "@/lib/mock-data/channels";

const steps = [
  { label: "Connect" },
  { label: "Verify" },
  { label: "Select Account" },
];

interface LinkedInSetupFlowProps {
  onComplete: () => void;
}

export function LinkedInSetupFlow({ onComplete }: LinkedInSetupFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleConnect() {
    if (!username.trim() || !password.trim()) {
      setError("LinkedIn email and password are required");
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess("Verification required - enter the code or approve on the LinkedIn app");
    setUsername("");
    setPassword("");
    setCurrentStep(1);
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) {
      setError("Enter the verification code");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setOtpCode("");
    setSuccess("LinkedIn account verified");
    setCurrentStep(2);
  }

  async function handleSkipCheckpoint() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess("Account found - select it below");
    setCurrentStep(2);
  }

  async function handleSelectAccount(accountId: string) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    setSelectedAccountId(accountId);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    setSuccess("LinkedIn account activated");
    setCurrentStep(3);
    setTimeout(onComplete, 1000);
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-signal-red-text px-1">
          <span className="w-3 h-3 flex items-center justify-center">✕</span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-1.5 text-[11px] text-signal-green-text px-1">
          <Check size={12} strokeWidth={2} />
          {success}
        </div>
      )}

      {/* Step 1: Connect LinkedIn */}
      {currentStep === 0 && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Connect Your LinkedIn
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="LinkedIn email"
              className="w-full px-3 py-2 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="LinkedIn password"
                className="w-full px-3 py-2 pr-9 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-faint hover:text-ink-muted"
              >
                {showPassword ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Linkedin size={12} />
                  Connect LinkedIn
                </>
              )}
            </button>
            <p className="text-[10px] text-ink-faint">
              Your credentials are sent securely to Unipile and are not stored by Leadey.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Verify Identity (2FA) */}
      {currentStep === 1 && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Verify Your Identity
          </p>
          <p className="text-[11px] text-ink-secondary mb-3">
            LinkedIn requires verification. Either enter the code sent to you, or approve the sign-in on the LinkedIn app.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter verification code"
              className="w-full px-3 py-2 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Submit Code"
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipCheckpoint}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[16px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I approved it on the app"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select Account */}
      {currentStep === 2 && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Select LinkedIn Account
          </p>
          <div className="space-y-1">
            {mockLinkedInAccounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  "flex items-center justify-between rounded-[8px] px-2 py-1.5 transition-colors",
                  selectedAccountId === account.id
                    ? "bg-signal-green/10 border border-signal-green-text/20"
                    : "hover:bg-hover"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink truncate">{account.name}</p>
                  <p className="text-[10px] text-ink-muted truncate">{account.type}</p>
                </div>
                {selectedAccountId === account.id ? (
                  <span className="text-[10px] font-medium text-signal-green-text flex items-center gap-1">
                    <Check size={11} />
                    Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectAccount(account.id)}
                    disabled={loading}
                    className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                  >
                    Select
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done state */}
      {currentStep === 3 && (
        <div className="rounded-[10px] border border-signal-green-text/20 bg-signal-green/10 px-3 py-3 text-center">
          <Check size={20} strokeWidth={2} className="text-signal-green-text mx-auto mb-1" />
          <p className="text-[12px] font-medium text-ink">LinkedIn Connected</p>
          <p className="text-[11px] text-ink-muted">Your account is ready to use</p>
        </div>
      )}
    </div>
  );
}
