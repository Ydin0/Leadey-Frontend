"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "./auth-card";
import { AuthInput } from "./auth-input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "code") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
      });

      const emailFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code"
      );

      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        setError("Email sign-in is not available for this account.");
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });

      setStep("code");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || "Could not send code.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = useCallback(
    async (fullCode: string) => {
      if (!isLoaded) return;

      setError("");
      setLoading(true);

      try {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: fullCode,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.push("/dashboard");
        }
      } catch (err) {
        if (isClerkAPIResponseError(err)) {
          setError(err.errors[0]?.longMessage || "Invalid code.");
        } else {
          setError("Verification failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signIn, setActive, router]
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
      const result = await signIn.create({ identifier: email });

      const emailFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code"
      );

      if (emailFactor && "emailAddressId" in emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
      }

      setCooldown(RESEND_COOLDOWN);
      setError("");
    } catch {
      setError("Could not resend code. Please try again.");
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setCode(Array(CODE_LENGTH).fill(""));
    setError("");
  }

  if (step === "code") {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a code to ${email}`}>
        <div className="space-y-6">
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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="text-[12px] text-ink-muted hover:text-ink transition-colors"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-[12px] text-accent font-medium hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSendCode} className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {error && (
          <p className="text-[11px] text-signal-red-text text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-[20px] bg-ink text-on-ink text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Continue with email
        </button>
      </form>

      <p className="text-[12px] text-ink-muted text-center mt-5">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-accent font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
