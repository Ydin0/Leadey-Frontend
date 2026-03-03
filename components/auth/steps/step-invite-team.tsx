"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import { AuthInput } from "../auth-input";
import { Loader2, X } from "lucide-react";

export function StepInviteTeam() {
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();

  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addEmail() {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (emails.includes(trimmed)) return;

    setEmails([...emails, trimmed]);
    setEmailInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  async function handleInvite() {
    if (!isLoaded || !organization || emails.length === 0) return;

    setError("");
    setLoading(true);

    try {
      await organization.inviteMembers({
        emailAddresses: emails,
        role: "org:member",
      });
      router.push("/dashboard");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || "Could not send invitations.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex gap-2">
          <div className="flex-1">
            <AuthInput
              label="Team member email"
              type="email"
              placeholder="colleague@company.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            onClick={addEmail}
            className="self-end px-4 py-2.5 rounded-[20px] bg-section text-ink text-[13px] font-medium border border-border-subtle hover:bg-hover transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emails.map((email) => (
            <span
              key={email}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-signal-blue text-signal-blue-text text-[11px] font-medium"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-signal-red-text text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={handleInvite}
        disabled={loading || emails.length === 0}
        className="w-full py-2.5 rounded-[20px] bg-ink text-on-ink text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Send invitations
      </button>

      <button
        type="button"
        onClick={handleSkip}
        className="w-full text-[12px] text-ink-muted hover:text-ink transition-colors text-center"
      >
        Skip for now
      </button>
    </div>
  );
}
