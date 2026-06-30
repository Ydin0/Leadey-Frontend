"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { OrgAvatar } from "@/components/shared/org-avatar";
import { useWorkspaces, roleLabel } from "@/lib/hooks/use-workspaces";

/** First-login workspace chooser — shown after sign-in when the user belongs to
 *  more than one workspace. Picking one activates it in Clerk and hard-navigates
 *  to the dashboard (AuthTokenSync mints the org-scoped backend token). */
export default function SelectWorkspacePage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { workspaces, isLoaded, switchTo, switchingTo } = useWorkspaces();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  // Defensive: nobody should reach here with 0/1 workspaces, but if they do,
  // don't strand them — send to the dashboard / auto-activate the only one.
  useEffect(() => {
    if (!isLoaded) return;
    if (workspaces.length === 0) {
      router.replace("/dashboard");
    } else if (workspaces.length === 1) {
      void switchTo(workspaces[0].id);
    }
  }, [isLoaded, workspaces, router, switchTo]);

  return (
    <div className="bg-surface rounded-[16px] border border-border-subtle shadow-xl shadow-black/30 overflow-hidden">
      <div className="px-6 pt-6 pb-4 text-center border-b border-border-subtle">
        <h1 className="font-display text-[20px] font-medium text-ink">Choose a workspace</h1>
        <p className="text-[12px] text-ink-muted mt-1">
          You&apos;re a member of {workspaces.length || "several"} workspaces. Pick one to continue.
        </p>
      </div>

      <div className="p-3">
        {!isLoaded ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {workspaces.map((w) => {
              const busy = switchingTo === w.id;
              return (
                <button
                  key={w.id}
                  disabled={!!switchingTo}
                  onClick={() => void switchTo(w.id)}
                  className="group flex items-center gap-3 w-full rounded-[12px] border border-border-subtle bg-section/40 hover:bg-hover hover:border-border-default px-3.5 py-3 text-left transition-colors disabled:opacity-60"
                >
                  <OrgAvatar id={w.id} name={w.name} imageUrl={w.imageUrl} size="lg" />
                  <div className="min-w-0 grow">
                    <p className="text-[14px] font-medium text-ink truncate">{w.name}</p>
                    <p className="text-[11.5px] text-ink-muted">
                      {roleLabel(w.role)}
                      {w.membersCount != null ? ` · ${w.membersCount} member${w.membersCount === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  {busy
                    ? <Loader2 size={16} className="text-ink-muted animate-spin shrink-0" />
                    : <ChevronRight size={16} className="text-ink-faint group-hover:text-ink-secondary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3.5 border-t border-border-subtle">
        <span className="text-[11px] text-ink-muted truncate">{email ? `Signed in as ${email}` : ""}</span>
        <button
          onClick={async () => { try { await signOut(); } finally { router.push("/sign-in"); } }}
          className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted hover:text-signal-red-text transition-colors shrink-0"
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </div>
  );
}
