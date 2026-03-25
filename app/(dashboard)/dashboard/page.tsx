"use client";

import { useState, useEffect, useCallback } from "react";
import { GitFork } from "lucide-react";
import Link from "next/link";
import { getDashboard, handleReply, type DashboardData } from "@/lib/api/dashboard";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { RepliesSection } from "@/components/dashboard/replies-section";
import { LinkedInSection } from "@/components/dashboard/linkedin-section";
import { CallsSection } from "@/components/dashboard/calls-section";
import { EmailSection } from "@/components/dashboard/email-section";
import { SignalsSection } from "@/components/dashboard/signals-section";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-6 animate-pulse">
      <div className="col-span-3 flex flex-col gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-[14px] border border-border-subtle p-6 h-32" />
        ))}
      </div>
      <div className="col-span-2">
        <div className="bg-surface rounded-[14px] border border-border-subtle p-6 h-64" />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="bg-surface rounded-[14px] border border-border-subtle p-12 text-center max-w-lg mx-auto mt-12">
      <div className="w-12 h-12 rounded-xl bg-section flex items-center justify-center mx-auto mb-4">
        <GitFork size={24} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h2 className="text-[16px] font-semibold text-ink mb-2">Welcome to Leadey</h2>
      <p className="text-[13px] text-ink-muted leading-relaxed mb-6">
        Create your first funnel to start building multi-channel outreach campaigns with LinkedIn, email, and calls.
      </p>
      <Link
        href="/dashboard/funnels/new"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[20px] bg-ink text-on-ink text-[12px] font-medium hover:bg-ink/90 transition-colors"
      >
        <GitFork size={14} strokeWidth={2} />
        Create Your First Funnel
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthReady = useAuthReady();

  const fetchData = useCallback(async () => {
    try {
      const result = await getDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    void fetchData();
  }, [fetchData, isAuthReady]);

  async function onReplyAction(leadId: string, action: string) {
    try {
      await handleReply(leadId, action);
      fetchData();
    } catch {
      // Silently fail — reply will still appear until next refresh
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-8 text-center">
        <p className="text-[13px] text-ink-muted">{error}</p>
        <button onClick={fetchData} className="mt-3 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium">
          Retry
        </button>
      </div>
    );
  }

  // Empty state: no data at all across all sections
  const isEmpty =
    data &&
    data.replies.length === 0 &&
    data.linkedin.length === 0 &&
    data.calls.length === 0 &&
    data.email.sentToday === 0 &&
    data.email.opens === 0;

  if (isEmpty) return <EmptyDashboard />;

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left Column — Task Queue (3/5) */}
      <div className="col-span-3 flex flex-col gap-6">
        <RepliesSection replies={data!.replies} onAction={onReplyAction} />
        <LinkedInSection queue={data!.linkedin} linkedinProgress={data!.linkedinProgress} onRefresh={fetchData} />
        <CallsSection calls={data!.calls} onRefresh={fetchData} />
        <EmailSection email={data!.email} />
      </div>

      {/* Right Column — Signals (2/5) */}
      <div className="col-span-2">
        <SignalsSection />
      </div>
    </div>
  );
}
