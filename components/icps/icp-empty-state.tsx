"use client";

import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function ICPEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      icon={Target}
      title="Create your first ICP"
      description="Define your Ideal Customer Profile to start discovering companies and enriching leads automatically."
      actionLabel="Create ICP"
      onAction={() => router.push("/dashboard/icps/new")}
    />
  );
}
