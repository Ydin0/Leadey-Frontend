"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Braces } from "lucide-react";
import { TEMPLATE_VARIABLES } from "@/lib/utils/personalize";
import { useCustomFields } from "@/lib/hooks/use-custom-fields";

interface VariablePickerProps {
  /** The input/textarea to insert the {{token}} into (at the caret). */
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}

/** "Insert variable" dropdown — standard personalization tokens + the org's
 *  custom fields, inserted as {{key}} at the bound field's caret. */
export function VariablePicker({ targetRef, value, onChange }: VariablePickerProps) {
  const { fields } = useCustomFields();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ left: r.left, top: r.bottom + 4 });
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => { if (!popRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", () => setOpen(false));
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function insert(key: string) {
    setOpen(false);
    const token = `{{${key}}}`;
    const el = targetRef.current;
    if (!el) { onChange((value || "") + token); return; }
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    const next = value.slice(0, s) + token + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + token.length;
      try { el.setSelectionRange(pos, pos); } catch { /* ignore */ }
    });
  }

  const customVars = fields.map((f) => ({ key: f.key, label: f.label }));

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        // keep the field's selection: prevent the button from stealing focus
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] bg-section border border-border-subtle text-[10.5px] font-medium text-ink-muted hover:text-ink-secondary hover:bg-hover transition-colors"
      >
        <Braces size={11} /> Variable
      </button>

      {open && rect && createPortal(
        <div
          ref={popRef}
          className="fixed z-[200] w-56 max-h-[300px] overflow-y-auto overscroll-contain rounded-[10px] border border-border-subtle bg-surface shadow-xl shadow-black/20 py-1"
          style={{ left: rect.left, top: rect.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 pt-1.5 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">Standard</div>
          {TEMPLATE_VARIABLES.map((v) => (
            <button key={v.key} type="button" onClick={() => insert(v.key)}
              className="flex items-center justify-between gap-2 w-full px-3 py-1.5 text-left text-[12px] text-ink-secondary hover:bg-hover hover:text-ink">
              <span>{v.label}</span><span className="text-[10px] text-ink-faint font-mono">{`{{${v.key}}}`}</span>
            </button>
          ))}
          {customVars.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">Custom fields</div>
              {customVars.map((v) => (
                <button key={v.key} type="button" onClick={() => insert(v.key)}
                  className="flex items-center justify-between gap-2 w-full px-3 py-1.5 text-left text-[12px] text-ink-secondary hover:bg-hover hover:text-ink">
                  <span className="truncate">{v.label}</span><span className="text-[10px] text-ink-faint font-mono shrink-0">{`{{${v.key}}}`}</span>
                </button>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
