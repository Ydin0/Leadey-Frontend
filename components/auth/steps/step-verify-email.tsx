"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSignUp, useClerk } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepVerifyEmailProps {
  onNext: () => void;
}

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function StepVerifyEmail({ onNext }: StepVerifyEmailProps) {
  const { signUp, isLoaded } = useSignUp();
  const clerk = useClerk();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingRef = useRef(false);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = useCallback(
    async (fullCode: string) => {
      if (!isLoaded || verifyingRef.current) return;
      verifyingRef.current = true;

      setError("");
      setLoading(true);

      try {
        // If already complete, just activate and advance
        if (signUp.status === "complete") {
          if (signUp.createdSessionId) {
            await clerk.setActive({ session: signUp.createdSessionId });
          }
          onNext();
          return;
        }

        const result = await signUp.attemptEmailAddressVerification({
          code: fullCode,
        });

        if (result.status === "complete" && result.createdSessionId) {
          // Sign-up done — activate the session, then advance
          await clerk.setActive({ session: result.createdSessionId });
          onNext();
        } else {
          // Status is not "complete" (e.g. missing_requirements).
          // No session yet — show a message instead of silently advancing.
          setError("Verification succeeded but sign-up is incomplete. Please try again or contact support.");
          verifyingRef.current = false;
        }
      } catch (err) {
        if (isClerkAPIResponseError(err)) {
          const msg = err.errors[0]?.longMessage || "";
          if (msg.toLowerCase().includes("already been verified")) {
            // Email already verified — if there's a session, activate and go
            if (signUp.createdSessionId) {
              await clerk.setActive({ session: signUp.createdSessionId });
            }
            onNext();
            return;
          }
          setError(msg || "Invalid code.");
        } else {
          setError("Verification failed. Please try again.");
        }
        verifyingRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signUp, clerk, onNext]
  );

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = next.join("");
    if (fullCode.length === CODE_LENGTH) {
      handleVerify(fullCode);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const next = [...code];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCode(next);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === CODE_LENGTH) {
      handleVerify(pasted);
    }
  }

  async function handleResend() {
    if (!isLoaded || cooldown > 0) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCooldown(RESEND_COOLDOWN);
      setError("");
    } catch {
      setError("Could not resend code. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-ink-muted text-center">
        We sent a 6-digit code to your email.
      </p>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              "w-10 h-12 text-center text-[18px] font-semibold rounded-[10px] bg-section border border-border-subtle text-ink focus:border-accent/50 focus:outline-none transition-colors",
              error && "border-signal-red-text/50"
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-[11px] text-signal-red-text text-center">{error}</p>
      )}

      {loading && (
        <div className="flex justify-center">
          <Loader2 size={18} className="animate-spin text-ink-muted" />
        </div>
      )}

      <p className="text-[12px] text-ink-muted text-center">
        Didn&apos;t receive a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-accent font-medium hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </div>
  );
}
