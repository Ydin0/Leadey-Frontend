"use client";

import { DispositionLibraryEditor } from "./disposition-library-editor";
import { VoicemailLibraryEditor } from "./voicemail-library-editor";

export function DialerSettingsTab() {
  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-ink">Call Dispositions</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Outcomes a rep can pick after a call. The funnel action determines
            what happens to the lead automatically.
          </p>
        </div>
        <DispositionLibraryEditor />
      </section>

      <section className="bg-surface rounded-[14px] border border-border-subtle p-4">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-ink">Voicemail Drops</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Pre-recorded voicemails the dialer can drop into a live call.
            Twilio plays the audio when you click Drop VM or when Answering
            Machine Detection fires.
          </p>
        </div>
        <VoicemailLibraryEditor />
      </section>
    </div>
  );
}
