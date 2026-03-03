"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { AuthInput } from "../auth-input";
import { Loader2 } from "lucide-react";

interface StepCreateOrgProps {
  onNext: () => void;
}

export function StepCreateOrg({ onNext }: StepCreateOrgProps) {
  const { createOrganization, setActive, isLoaded } = useOrganizationList();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingSubmitRef = useRef(false);

  // When createOrganization becomes available and we have a pending submit, retry
  const handleCreate = useCallback(
    async (name: string) => {
      if (!createOrganization || !setActive) return;

      setError("");
      setLoading(true);

      try {
        const org = await createOrganization({ name });
        await setActive({ organization: org.id });
        onNext();
      } catch (err) {
        if (isClerkAPIResponseError(err)) {
          setError(err.errors[0]?.longMessage || "Could not create organisation.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
        pendingSubmitRef.current = false;
      }
    },
    [createOrganization, setActive, onNext]
  );

  // Retry pending submission once createOrganization becomes available
  useEffect(() => {
    if (pendingSubmitRef.current && createOrganization && companyName) {
      handleCreate(companyName);
    }
  }, [createOrganization, handleCreate, companyName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    if (!createOrganization) {
      // Hook not ready yet — mark as pending so it retries when ready
      pendingSubmitRef.current = true;
      setLoading(true);
      return;
    }

    await handleCreate(companyName);
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
        type="url"
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
