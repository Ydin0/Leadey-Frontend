"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { AuthInput } from "../auth-input";
import { Loader2 } from "lucide-react";

interface StepCreateOrgProps {
  onNext: () => void;
}

export function StepCreateOrg({ onNext }: StepCreateOrgProps) {
  const clerk = useClerk();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const org = await clerk.createOrganization({ name: companyName });
      await clerk.setActive({ organization: org.id });
      onNext();
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage || "Could not create organisation.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Company name"
        placeholder="Acme Inc."
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
      />
      <AuthInput
        label="Website (optional)"
        placeholder="https://acme.com"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
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
        Continue
      </button>
    </form>
  );
}
