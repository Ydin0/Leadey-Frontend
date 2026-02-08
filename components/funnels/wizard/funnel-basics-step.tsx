"use client";

interface FunnelBasicsStepProps {
  name: string;
  description: string;
  onChange: (data: { name: string; description: string }) => void;
}

export function FunnelBasicsStep({ name, description, onChange }: FunnelBasicsStepProps) {
  return (
    <div>
      <h2 className="text-[16px] font-semibold text-ink mb-1">Funnel Basics</h2>
      <p className="text-[12px] text-ink-muted mb-6">Give your funnel a name and description</p>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-medium text-ink-secondary block mb-1.5">Funnel Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value, description })}
            placeholder="e.g. UK SaaS Q1 Outbound"
            className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-secondary block mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => onChange({ name, description: e.target.value })}
            placeholder="Briefly describe the purpose of this funnel"
            rows={3}
            className="w-full px-3 py-2 rounded-[10px] bg-section border border-border-subtle text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-default resize-none"
          />
        </div>
      </div>
    </div>
  );
}
