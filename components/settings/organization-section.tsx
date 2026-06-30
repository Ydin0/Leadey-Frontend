"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { apiRequest } from "@/lib/api/client";
import { NativeSelect } from "@/components/ui/native-select";
import { OrgAvatar } from "@/components/shared/org-avatar";

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
  const { organization, membership, isLoaded } = useOrganization();
  const isAuthReady = useAuthReady();
  const [orgName, setOrgName] = useState("");
  const [settings, setSettings] = useState<OrgSettings>({ country: "", billingEmail: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only org admins may change the workspace logo (Clerk enforces this too).
  const isAdmin = membership?.role === "org:admin";

  async function handleLogoFile(file: File | undefined) {
    if (!file || !organization) return;
    if (!file.type.startsWith("image/")) { setLogoError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setLogoError("Image must be under 10MB."); return; }
    setUploadingLogo(true);
    setLogoError(null);
    try {
      await organization.setLogo({ file });
    } catch {
      setLogoError("Couldn't upload the logo. Try again.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!organization) return;
    setUploadingLogo(true);
    setLogoError(null);
    try {
      await organization.setLogo({ file: null });
    } catch {
      setLogoError("Couldn't remove the logo. Try again.");
    } finally {
      setUploadingLogo(false);
    }
  }

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

        {/* Logo — shows in the workspace switcher when the user clicks their avatar */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border-subtle">
          <OrgAvatar
            id={organization.id}
            name={organization.name}
            imageUrl={organization.hasImage ? organization.imageUrl : null}
            size="xl"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink mb-0.5">Workspace logo</p>
            <p className="text-[11px] text-ink-muted mb-2">
              {isAdmin ? "PNG, JPG or SVG, up to 10MB. Shows in the workspace switcher." : "Only admins can change the workspace logo."}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => void handleLogoFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover transition-colors border border-border-subtle disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {organization.hasImage ? "Change logo" : "Upload logo"}
                </button>
                {organization.hasImage && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveLogo()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-ink-muted text-[11px] font-medium hover:text-signal-red-text hover:bg-signal-red/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            )}
            {logoError && <p className="text-[11px] text-signal-red-text mt-1.5">{logoError}</p>}
          </div>
        </div>

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
