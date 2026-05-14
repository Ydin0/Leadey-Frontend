"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { apiRequest } from "@/lib/api/client";
import { NativeSelect } from "@/components/ui/native-select";

const COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "SE", name: "Sweden" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
];

interface OrgSettings {
  country: string;
  billingEmail: string;
  website: string;
}

export function OrganizationSection() {
  const { organization, isLoaded } = useOrganization();
  const isAuthReady = useAuthReady();
  const [orgName, setOrgName] = useState("");
  const [settings, setSettings] = useState<OrgSettings>({ country: "", billingEmail: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
    }
  }, [organization]);

  // Load org settings from backend
  useEffect(() => {
    if (!isAuthReady) return;
    apiRequest<OrgSettings>("/settings/organization")
      .then(setSettings)
      .catch(() => {}); // silently fail — defaults will show
  }, [isAuthReady]);

  async function handleSave() {
    if (!organization) return;
    setSaving(true);
    try {
      // Update org name via Clerk
      if (orgName !== organization.name) {
        await organization.update({ name: orgName });
      }
      // Save settings to backend
      await apiRequest("/settings/organization", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update organization:", err);
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

  if (!organization) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <p className="text-[12px] text-ink-muted">No organization found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-[14px] border border-border-subtle p-5">
        <h3 className="text-[14px] font-semibold text-ink mb-1">Organization Settings</h3>
        <p className="text-[11px] text-ink-muted mb-4">Workspace identity, defaults, and access policy.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Organization Name</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Country</label>
            <NativeSelect value={settings.country} onChange={(e) => setSettings({ ...settings, country: e.target.value })}>
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Website</label>
            <input type="url" value={settings.website} onChange={(e) => setSettings({ ...settings, website: e.target.value })} placeholder="https://yourcompany.com"
              className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Billing Email</label>
            <input type="email" value={settings.billingEmail} onChange={(e) => setSettings({ ...settings, billingEmail: e.target.value })} placeholder="finance@company.com"
              className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 placeholder:text-ink-faint" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Members</label>
            <input type="text" value={`${organization.membersCount || 0} members`} disabled
              className="w-full px-3 py-2 rounded-[10px] bg-section/50 text-[12px] text-ink-muted outline-none border border-border-subtle cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Created</label>
            <input type="text" value={organization.createdAt ? new Date(organization.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""} disabled
              className="w-full px-3 py-2 rounded-[10px] bg-section/50 text-[12px] text-ink-muted outline-none border border-border-subtle cursor-not-allowed" />
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
