"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendAssistantMessage, type AssistantMessage } from "@/lib/api/assistant";

const SUGGESTIONS = [
  "How many leads do we have?",
  "Which campaign has the most leads?",
  "Summarise my recent calls",
  "Who made the most calls this week?",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the latest message in view + focus the input when opened.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  // Auto-grow the composer with its content (up to a max), so multi-line input
  // expands the box instead of scrolling text out of view.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await sendAssistantMessage(next);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[61] w-[390px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] flex flex-col rounded-[18px] border border-border-default bg-surface shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-section/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/15">
                <Sparkles size={16} className="text-accent" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-ink leading-tight">Leadey Assistant</div>
                <div className="text-[10.5px] text-ink-muted">Ask about your leads, calls &amp; campaigns</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setError(null); }}
                  className="text-[10.5px] text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-hover transition-colors"
                >
                  New chat
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md text-ink-muted hover:bg-hover hover:text-ink transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center mt-6 mb-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-3">
                  <Bot size={22} className="text-accent" />
                </div>
                <div className="text-[14px] font-semibold text-ink">How can I help?</div>
                <p className="text-[12px] text-ink-muted mt-1 max-w-[280px]">
                  I can pull from your workspace — leads, companies, campaigns, calls and team activity — and help you draft outreach.
                </p>
                <div className="flex flex-col gap-1.5 mt-4 w-full">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="text-left text-[12px] text-ink-secondary bg-section hover:bg-hover border border-border-subtle rounded-[10px] px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words",
                      m.role === "user"
                        ? "bg-accent text-on-ink rounded-br-[4px]"
                        : "bg-section text-ink rounded-bl-[4px]",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-section text-ink-muted rounded-[14px] rounded-bl-[4px] px-3.5 py-2.5 text-[12px]">
                  <Loader2 size={13} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && <div className="text-[11.5px] text-signal-red-text px-1">{error}</div>}
          </div>

          {/* Composer */}
          <div className="border-t border-border-subtle p-3 shrink-0">
            <div className="flex items-end gap-2 bg-section border border-border-subtle rounded-[14px] px-3 py-2 focus-within:border-border-default transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask anything about your workspace…"
                className="flex-1 bg-transparent border-0 outline-0 resize-none text-[12.5px] leading-relaxed text-ink placeholder:text-ink-faint max-h-32 overflow-y-auto"
              />
              <button
                onClick={() => void send(input)}
                disabled={busy || !input.trim()}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-ink text-on-ink hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[9.5px] text-ink-faint mt-1.5 text-center">
              Answers use your live workspace data. Double-check anything important.
            </p>
          </div>
        </div>
      )}

      {/* Floating launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Leadey Assistant"
        aria-label="Open Leadey Assistant"
        className={cn(
          // z-40 keeps the launcher BELOW drawers/modals (z-50+) so it can never
          // cover their controls (e.g. the SMS composer's Send button). When no
          // overlay is open it's still the top-most thing in its corner.
          "fixed bottom-6 right-6 z-40 flex items-center justify-center w-[52px] h-[52px] rounded-full shadow-xl transition-all hover:scale-105",
          open ? "bg-ink text-on-ink" : "bg-accent text-on-ink",
        )}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </>
  );
}
