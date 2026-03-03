"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepIndicator } from "@/components/shared/step-indicator";
import { mockEmailAccounts } from "@/lib/mock-data/channels";
import type { EmailAccount } from "@/lib/types/channel";

const steps = [{ label: "Connect" }, { label: "Select Accounts" }];

interface EmailSetupFlowProps {
  onComplete: () => void;
}

export function EmailSetupFlow({ onComplete }: EmailSetupFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>(
    mockEmailAccounts.map((a) => ({ ...a, selected: false }))
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setApiKey("");
    setSuccess("Connected to Smartlead successfully");
    setCurrentStep(1);
  }

  function toggleAccount(id: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  }

  async function handleSaveSelection() {
    const selected = accounts.filter((a) => a.selected);
    if (selected.length === 0) {
      setError("Select at least one email account");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(`${selected.length} email account${selected.length > 1 ? "s" : ""} activated`);
    setCurrentStep(2);
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

      {/* Step 1: Connect Smartlead */}
      {currentStep === 0 && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">
            Connect Smartlead
          </p>
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Smartlead API key"
                className="w-full px-3 py-2 pr-9 rounded-[8px] bg-surface border border-border-subtle text-[11px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-faint hover:text-ink-muted"
              >
                {showKey ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
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
                  Testing...
                </>
              ) : (
                "Test & Connect"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Accounts */}
      {currentStep === 1 && (
        <div className="rounded-[10px] border border-border-subtle bg-section/40 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">
              Select Sending Accounts
            </p>
            <button
              type="button"
              onClick={handleSaveSelection}
              disabled={loading}
              className="px-3 py-1 rounded-[16px] bg-ink text-on-ink text-[10px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Selection"}
            </button>
          </div>
          <div className="space-y-1">
            {accounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-hover cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={account.selected}
                  onChange={() => toggleAccount(account.id)}
                  className="rounded border-border-default accent-signal-blue-text"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink truncate">{account.email}</p>
                  {account.fromName && (
                    <p className="text-[10px] text-ink-muted truncate">{account.fromName}</p>
                  )}
                </div>
                {!account.isActive && (
                  <span className="text-[9px] text-signal-red-text font-medium">Inactive</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Done state */}
      {currentStep === 2 && (
        <div className="rounded-[10px] border border-signal-green-text/20 bg-signal-green/10 px-3 py-3 text-center">
          <Check size={20} strokeWidth={2} className="text-signal-green-text mx-auto mb-1" />
          <p className="text-[12px] font-medium text-ink">Email Connected</p>
          <p className="text-[11px] text-ink-muted">Your sending accounts are ready</p>
        </div>
      )}
    </div>
  );
}
