"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { NativeSelect } from "@/components/ui/native-select";
import { MemberAvatar } from "@/components/shared/member-avatar";

const TIMEZONES = [
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam", "Europe/Madrid",
  "Europe/Rome", "Europe/Dublin", "Europe/Stockholm", "Europe/Zurich",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Hong_Kong", "Asia/Kolkata",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
  "UTC",
];

export function ProfileSection() {
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      // Load saved timezone from user metadata
      const savedTz = (user.unsafeMetadata as any)?.timezone;
      if (savedTz) setTimezone(savedTz);
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({
        firstName,
        lastName,
        unsafeMetadata: { ...(user.unsafeMetadata || {}), timezone },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (!user) return null;

  const primaryEmail = user.primaryEmailAddress?.emailAddress || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <div className="flex items-center gap-3.5 mb-5">
          <MemberAvatar id={user.id} name={fullName || primaryEmail} size="xl" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink truncate">{fullName || "Your profile"}</h3>
            <p className="text-[12px] text-ink-muted truncate">{primaryEmail}</p>
          </div>
        </div>
        <h3 className="text-[14px] font-semibold text-ink mb-1">Profile Settings</h3>
        <p className="text-[11px] text-ink-muted mb-4">Your personal account details and security controls.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Full Name</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First"
                className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30" />
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last"
                className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Email</label>
            <input type="email" value={primaryEmail} disabled
              className="w-full px-3 py-2 rounded-[10px] bg-section/50 text-[12px] text-ink-muted outline-none border border-border-subtle cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Phone</label>
            <input type="text" value={user.primaryPhoneNumber?.phoneNumber || ""} disabled
              className="w-full px-3 py-2 rounded-[10px] bg-section/50 text-[12px] text-ink-muted outline-none border border-border-subtle cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Timezone</label>
            <NativeSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
            </NativeSelect>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
            {saving && <Loader2 size={11} className="animate-spin" />}
            Save Changes
          </button>
          {saved && <span className="text-[11px] text-signal-green-text">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
