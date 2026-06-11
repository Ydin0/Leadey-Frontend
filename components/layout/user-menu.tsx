"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  UserCircle2, Building2, Users, CreditCard, Bell, Sun, Moon, Monitor,
  LogOut, ChevronRight, Settings,
} from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";

interface MenuLink {
  label: string;
  icon: typeof UserCircle2;
  href: string;
}

// Quick-access destinations — each deep-links to the matching Settings tab.
const LINKS: MenuLink[] = [
  { label: "Profile settings", icon: UserCircle2, href: "/dashboard/settings?tab=profile" },
  { label: "Organization", icon: Building2, href: "/dashboard/settings?tab=organization" },
  { label: "Team", icon: Users, href: "/dashboard/settings?tab=team" },
  { label: "Billing & plan", icon: CreditCard, href: "/dashboard/settings?tab=billing" },
  { label: "Notifications", icon: Bell, href: "/dashboard/settings?tab=notifications" },
];

const THEMES: { id: string; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Custom Leadey account menu — replaces Clerk's default UserButton with a
 *  branded dropdown: gradient avatar, identity block, quick links, an inline
 *  theme switcher, and sign-out. */
export function UserMenu() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const id = user?.id ?? "you";
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const displayName = name || email || "Account";

  const go = (href: string) => { setOpen(false); router.push(href); };

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } finally {
      router.push("/sign-in");
    }
  };

  if (!isLoaded) return <div className="w-8 h-8 rounded-full bg-section animate-pulse" />;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "rounded-full transition-shadow outline-none",
          open ? "ring-2 ring-accent ring-offset-2 ring-offset-page" : "hover:ring-2 hover:ring-border-default hover:ring-offset-2 hover:ring-offset-page",
        )}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MemberAvatar id={id} name={displayName} size="md" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[268px] z-50 rounded-[14px] border border-border-subtle bg-surface shadow-xl shadow-black/20 overflow-hidden"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
            <MemberAvatar id={id} name={displayName} size="lg" className="w-11 h-11 text-[14px]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink truncate">{displayName}</p>
              {email && <p className="text-[11px] text-ink-muted truncate">{email}</p>}
            </div>
          </div>

          {/* Quick links */}
          <div className="p-1.5">
            {LINKS.map(({ label, icon: Icon, href }) => (
              <button
                key={href}
                role="menuitem"
                onClick={() => go(href)}
                className="group flex items-center gap-2.5 w-full rounded-[9px] px-2.5 py-2 text-[12.5px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
              >
                <Icon size={15} strokeWidth={1.5} className="text-ink-muted group-hover:text-ink-secondary shrink-0" />
                <span className="grow text-left">{label}</span>
                <ChevronRight size={13} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Theme switcher */}
          <div className="px-3 py-2.5 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Theme</span>
            </div>
            <div className="flex items-center gap-1 bg-section rounded-full p-[3px]">
              {THEMES.map(({ id: t, label, icon: Icon }) => {
                const active = mounted && theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 grow rounded-full py-1.5 text-[11px] font-medium transition-all",
                      active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                    )}
                  >
                    <Icon size={13} strokeWidth={1.5} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-1.5 border-t border-border-subtle">
            <button
              role="menuitem"
              onClick={() => go("/dashboard/settings")}
              className="group flex items-center gap-2.5 w-full rounded-[9px] px-2.5 py-2 text-[12.5px] text-ink-secondary hover:bg-hover hover:text-ink transition-colors"
            >
              <Settings size={15} strokeWidth={1.5} className="text-ink-muted group-hover:text-ink-secondary shrink-0" />
              <span className="grow text-left">All settings</span>
            </button>
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="group flex items-center gap-2.5 w-full rounded-[9px] px-2.5 py-2 text-[12.5px] text-signal-red-text hover:bg-signal-red/10 transition-colors"
            >
              <LogOut size={15} strokeWidth={1.5} className="shrink-0" />
              <span className="grow text-left">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
