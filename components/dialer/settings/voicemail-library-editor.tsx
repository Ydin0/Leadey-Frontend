"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Mic,
  Square,
  Play,
  Trash2,
  Upload,
  Check,
  CircleDot,
} from "lucide-react";
import {
  getVoicemailDrops,
  uploadVoicemailDrop,
  deleteVoicemailDrop,
} from "@/lib/api/dialer";
import type { VoicemailDrop } from "@/lib/types/dialer";

export function VoicemailLibraryEditor() {
  const [rows, setRows] = useState<VoicemailDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recorder state
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [vmName, setVmName] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const list = await getVoicemailDrops();
      setRows(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load voicemails");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  // ── Browser-based recording ────────────────────────────────────
  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordedSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordedSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      setError(err?.message || "Microphone access denied");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function discardRecording() {
    setRecordedBlob(null);
    setRecordedSeconds(0);
    setVmName("");
  }

  async function saveRecording() {
    if (!recordedBlob || !vmName.trim()) {
      setError("Give the voicemail a name first");
      return;
    }
    setBusy("save");
    try {
      const saved = await uploadVoicemailDrop({
        audio: recordedBlob,
        name: vmName.trim(),
        durationSeconds: recordedSeconds,
        isDefault: rows.length === 0,
        scope: "user",
      });
      setRows((prev) => [saved, ...prev]);
      discardRecording();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, "");
    setBusy("upload");
    try {
      const saved = await uploadVoicemailDrop({
        audio: file,
        name,
        scope: "user",
      });
      setRows((prev) => [saved, ...prev]);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setBusy(id);
    try {
      await deleteVoicemailDrop(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-[8px] bg-signal-red/10 text-[11px] text-signal-red-text">
          {error}
        </div>
      )}

      {/* Recorder */}
      <div className="rounded-[10px] border border-border-subtle bg-section/40 p-3 space-y-3">
        {!recordedBlob ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-ink">Record a new voicemail</p>
              <p className="text-[10px] text-ink-muted">
                {recording ? `Recording… ${recordedSeconds}s` : "30 seconds is plenty. Mic permission required."}
              </p>
            </div>
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-signal-red-text text-white text-[11px] font-medium hover:opacity-90"
              >
                <Mic size={11} /> Start recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-section text-ink text-[11px] font-medium hover:bg-hover"
              >
                <Square size={11} /> Stop
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-ink">
              Recording ready ({recordedSeconds}s) — name it and save:
            </p>
            <div className="flex items-center gap-2">
              <input
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                placeholder="e.g. Cold outbound intro"
                className="flex-1 px-3 py-1.5 rounded-[8px] bg-surface text-[12px] text-ink border border-border-subtle outline-none focus:border-border-default"
              />
              <audio controls src={URL.createObjectURL(recordedBlob)} className="h-8" />
              <button
                type="button"
                onClick={saveRecording}
                disabled={busy === "save"}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[20px] bg-signal-green text-signal-green-text text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy === "save" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Save
              </button>
              <button
                type="button"
                onClick={discardRecording}
                className="px-3 py-1.5 rounded-[20px] bg-section text-ink-secondary text-[11px] font-medium hover:bg-hover"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-ink-faint">
          Or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-signal-blue-text hover:underline inline-flex items-center gap-1"
          >
            <Upload size={10} /> upload an audio file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Library list */}
      {rows.length === 0 ? (
        <p className="text-[11px] text-ink-muted text-center py-4">
          No voicemails yet. Record one above.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border border-border-subtle bg-surface"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium text-ink truncate">{v.name}</p>
                  {v.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] text-signal-green-text">
                      <CircleDot size={10} /> default
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-muted">
                  {v.durationSeconds}s · {v.userId ? "Personal" : "Org-wide"}
                </p>
              </div>
              <audio controls src={v.recordingUrl} className="h-7" preload="none" />
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                disabled={busy === v.id}
                className="p-1.5 rounded text-ink-faint hover:text-signal-red-text hover:bg-signal-red/10 disabled:opacity-50"
              >
                {busy === v.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
