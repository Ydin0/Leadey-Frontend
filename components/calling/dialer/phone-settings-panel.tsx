"use client";

import { useEffect } from "react";
import { Mic, Volume2, ChevronLeft, RefreshCw } from "lucide-react";
import { useCallContext } from "@/components/calling/call-context";
import { NativeSelect } from "@/components/ui/native-select";

/** Mic / speaker picker for the browser softphone. Lets a rep choose which
 *  microphone (e.g. a headset) Twilio captures and which speaker plays calls. */
export function PhoneSettingsPanel({ onBack }: { onBack: () => void }) {
  const {
    audioInputDevices,
    audioOutputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    outputSelectionSupported,
    setInputDevice,
    setOutputDevice,
    refreshAudioDevices,
  } = useCallContext();

  // Request mic permission on open so device labels are real names, not blanks.
  useEffect(() => {
    void refreshAudioDevices();
  }, [refreshAudioDevices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-secondary transition-colors"
        >
          <ChevronLeft size={13} /> Back
        </button>
        <button
          type="button"
          onClick={() => void refreshAudioDevices()}
          title="Re-scan devices"
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-secondary transition-colors"
        >
          <RefreshCw size={12} /> Rescan
        </button>
      </div>

      <h3 className="text-[13px] font-semibold text-ink">Audio settings</h3>

      {/* Microphone */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          <Mic size={11} /> Microphone
        </label>
        <NativeSelect
          value={selectedInputDeviceId ?? "default"}
          onChange={(e) => void setInputDevice(e.target.value)}
        >
          <option value="default">System default</option>
          {audioInputDevices
            .filter((d) => d.deviceId !== "default")
            .map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
        </NativeSelect>
        {audioInputDevices.length === 0 && (
          <p className="text-[10px] text-ink-faint mt-1">
            No microphones detected. Allow mic access, then Rescan.
          </p>
        )}
      </div>

      {/* Speaker */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          <Volume2 size={11} /> Speaker
        </label>
        {outputSelectionSupported ? (
          <NativeSelect
            value={selectedOutputDeviceId ?? "default"}
            onChange={(e) => void setOutputDevice(e.target.value)}
          >
            <option value="default">System default</option>
            {audioOutputDevices
              .filter((d) => d.deviceId !== "default")
              .map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
          </NativeSelect>
        ) : (
          <p className="text-[10px] text-ink-faint">
            This browser doesn&apos;t support choosing a speaker — calls use your
            system default output.
          </p>
        )}
      </div>

      <p className="text-[10px] text-ink-faint leading-[1.5]">
        Your choice is saved on this device and used for every call.
      </p>
    </div>
  );
}
