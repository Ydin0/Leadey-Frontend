"use client";

import { cn } from "@/lib/utils";
import type { PhoneLineConfig } from "@/lib/types/calling";

interface LineConfigFormProps {
  config: PhoneLineConfig;
  onChange: (config: PhoneLineConfig) => void;
}

export function LineConfigForm({ config, onChange }: LineConfigFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Voicemail Greeting
        </label>
        <input
          type="text"
          value={config.voicemailGreeting}
          onChange={(e) => onChange({ ...config, voicemailGreeting: e.target.value })}
          placeholder="Enter voicemail greeting..."
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          Call Forwarding Number
        </label>
        <input
          type="text"
          value={config.callForwardingNumber}
          onChange={(e) => onChange({ ...config, callForwardingNumber: e.target.value })}
          placeholder="+1 (555) 000-0000"
          className="w-full px-3 py-2 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-section/50 px-3 py-2">
        <div>
          <p className="text-[12px] text-ink font-medium">Call Recording</p>
          <p className="text-[11px] text-ink-muted">Automatically record all calls on this line.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, callRecordingEnabled: !config.callRecordingEnabled })}
          className={cn(
            "w-10 h-5 rounded-full p-0.5 transition-colors",
            config.callRecordingEnabled ? "bg-signal-blue-text" : "bg-border-default"
          )}
        >
          <span
            className={cn(
              "block h-4 w-4 rounded-full bg-surface transition-transform",
              config.callRecordingEnabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}
