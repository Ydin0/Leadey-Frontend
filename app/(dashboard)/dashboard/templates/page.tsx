"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Loader2, Mail, Linkedin, MessageSquare, Signature } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/components/providers/auth-token-sync";
import { EmptyState } from "@/components/shared/empty-state";
import { TemplateCard } from "@/components/templates/template-card";
import { SignaturesPanel } from "@/components/templates/signatures-panel";
import { listTemplates } from "@/lib/api/templates";
import type { Template } from "@/lib/types/template";

type TabKey = "all" | "email" | "linkedin" | "sms";

const tabs: { key: TabKey; label: string; icon?: typeof Mail }[] = [
  { key: "all", label: "All" },
  { key: "email", label: "Email", icon: Mail },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "sms", label: "SMS", icon: MessageSquare },
];

export default function TemplatesPage() {
  const router = useRouter();
  const isAuthReady = useAuthReady();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [section, setSection] = useState<"templates" | "signatures">("templates");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    loadTemplates();
  }, [isAuthReady, loadTemplates]);

  const filtered = activeTab === "all"
    ? templates
    : templates.filter((t) => t.channel === activeTab);

  if (loading && section === "templates") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Templates</h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Reusable message templates and team signatures
          </p>
        </div>
        {section === "templates" && templates.length > 0 && (
          <button
            onClick={() => router.push("/dashboard/templates/new")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-ink text-on-ink text-[11px] font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            New Template
          </button>
        )}
      </div>

      {/* Section switch: Templates | Signatures */}
      <div className="inline-flex items-center gap-1 mb-5 p-0.5 rounded-full bg-section border border-border-subtle">
        {([["templates", "Templates", FileText], ["signatures", "Signatures", Signature]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors",
              section === key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {section === "signatures" && <SignaturesPanel />}

      {section === "templates" && (
      <>{/* templates view */}

      {/* Tabs */}
      {templates.length > 0 && (
        <div className="flex items-center gap-1 mb-5 border-b border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              )}
            >
              {tab.icon && <tab.icon size={12} />}
              {tab.label}
              <span className="text-[10px] text-ink-faint ml-0.5">
                {tab.key === "all" ? templates.length : templates.filter((t) => t.channel === tab.key).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create reusable email and LinkedIn message templates to speed up your outreach."
          actionLabel="Create Template"
          onAction={() => router.push("/dashboard/templates/new")}
        />
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => router.push(`/dashboard/templates/${template.id}`)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && templates.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-[12px] text-ink-muted">No {activeTab} templates</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
