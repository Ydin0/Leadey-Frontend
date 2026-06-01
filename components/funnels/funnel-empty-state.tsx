"use client";

import { useRouter } from "next/navigation";
import { GitFork } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function FunnelEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      icon={GitFork}
      title="Create your first Campaign"
      description="Build multi-channel outreach sequences to engage leads through email, LinkedIn, and calls."
      actionLabel="Create Campaign"
      onAction={() => router.push("/dashboard/funnels/new")}
    />
  );
}
