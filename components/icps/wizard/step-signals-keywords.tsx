"use client";

import {
  Users,
  DollarSign,
  Cpu,
  Newspaper,
  UserCheck,
  Globe,
  Search,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/shared/tag-input";
import type { ICP, SignalType } from "@/lib/types/icp";

const signalTypeConfig: { type: SignalType; icon: typeof Users; label: string; description: string }[] = [
  { type: "hiring", icon: Users, label: "Hiring", description: "Job postings and headcount growth signals" },
  { type: "funding", icon: DollarSign, label: "Funding", description: "Fundraising rounds and financial events" },
  { type: "tech_adoption", icon: Cpu, label: "Tech Adoption", description: "New tools and technology stack changes" },
  { type: "news", icon: Newspaper, label: "News & PR", description: "Company announcements and press coverage" },
  { type: "job_change", icon: UserCheck, label: "Job Changes", description: "Key hires, departures, and promotions" },
  { type: "expansion", icon: Globe, label: "Expansion", description: "New offices, markets, and international growth" },
  { type: "intent", icon: Search, label: "Intent Signals", description: "Research activity and content consumption" },
  { type: "social", icon: MessageCircle, label: "Social Activity", description: "LinkedIn posts, Twitter/X engagement" },
];

const technologySuggestions = [
  "Salesforce", "HubSpot", "Outreach", "Gong", "ZoomInfo", "Apollo",
  "Slack", "Notion", "Linear", "GitHub", "AWS", "Google Cloud",
  "Stripe", "Snowflake", "Datadog", "MongoDB", "Vercel", "Supabase",
];

interface StepSignalsKeywordsProps {
  data: Partial<ICP>;
  onChange: (data: Partial<ICP>) => void;
}

export function StepSignalsKeywords({ data, onChange }: StepSignalsKeywordsProps) {
  const prefs = data.signalPreferences || {
    enabledSignals: [],
    keywords: [],
    technologies: [],
  };

  function updatePrefs(partial: Partial<typeof prefs>) {
    onChange({ ...data, signalPreferences: { ...prefs, ...partial } });
  }

  function toggleSignal(type: SignalType) {
    const next = prefs.enabledSignals.includes(type)
      ? prefs.enabledSignals.filter((s) => s !== type)
      : [...prefs.enabledSignals, type];
    updatePrefs({ enabledSignals: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink mb-1">What should we watch for?</h2>
        <p className="text-[12px] text-ink-muted">Choose which signals to track and keywords to monitor</p>
      </div>

      {/* Signal Type Toggles */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Signal Types</label>
        <div className="space-y-1.5">
          {signalTypeConfig.map((s) => {
            const Icon = s.icon;
            const enabled = prefs.enabledSignals.includes(s.type);
            return (
              <button
                key={s.type}
                onClick={() => toggleSignal(s.type)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors border text-left",
                  enabled
                    ? "bg-signal-blue/50 border-signal-blue-text/15"
                    : "bg-surface border-border-subtle hover:bg-hover"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  enabled ? "bg-signal-blue" : "bg-section"
                )}>
                  <Icon size={14} strokeWidth={1.5} className={enabled ? "text-signal-blue-text" : "text-ink-muted"} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn("text-[12px] font-medium", enabled ? "text-ink" : "text-ink-secondary")}>{s.label}</span>
                  <p className="text-[11px] text-ink-muted">{s.description}</p>
                </div>
                <div className={cn("w-8 h-4 rounded-full transition-colors relative shrink-0", enabled ? "bg-signal-blue-text" : "bg-section")}>
                  <div className={cn("w-3 h-3 rounded-full bg-surface absolute top-0.5 transition-all", enabled ? "left-4.5" : "left-0.5")} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keywords */}
      <TagInput
        label="Keywords"
        tags={prefs.keywords}
        onChange={(keywords) => updatePrefs({ keywords })}
        placeholder="Add industry or product keywords..."
      />

      {/* Technologies */}
      <TagInput
        label="Technologies"
        tags={prefs.technologies}
        onChange={(technologies) => updatePrefs({ technologies })}
        placeholder="Search technologies..."
        suggestions={technologySuggestions}
      />
    </div>
  );
}
