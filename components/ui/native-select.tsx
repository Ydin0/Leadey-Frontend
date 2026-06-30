"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A Leadey-styled single-select dropdown that is a drop-in replacement for a
 * native `<select>` — same props (`value`, `onChange`, `disabled`, `className`)
 * and `<option>` children — but renders a branded popup (portaled to <body> so
 * it escapes overflow/transform containers) instead of the OS menu. `onChange`
 * receives a minimal synthetic event so existing `e.target.value` call sites
 * keep working unchanged.
 */
type Opt = { value: string; label: React.ReactNode; disabled?: boolean };

/** A flat render list that preserves <optgroup> labels as section headers. */
type Item = { kind: "header"; label: React.ReactNode } | (Opt & { kind: "option" });

function collectItems(children: React.ReactNode): Item[] {
  const out: Item[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option") {
      const p = child.props as { value?: unknown; children?: React.ReactNode; disabled?: boolean };
      out.push({ kind: "option", value: String(p.value ?? ""), label: p.children ?? String(p.value ?? ""), disabled: p.disabled });
    } else if (child.type === "optgroup") {
      const p = child.props as { label?: React.ReactNode; children?: React.ReactNode };
      if (p.label) out.push({ kind: "header", label: p.label });
      out.push(...collectItems(p.children));
    } else if (child.type === React.Fragment) {
      out.push(...collectItems((child.props as { children?: React.ReactNode }).children));
    }
  });
  return out;
}

export function NativeSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  ...rest
}: React.ComponentProps<"select">) {
  const items = React.useMemo(() => collectItems(children), [children]);
  const options = React.useMemo(() => items.filter((i): i is Opt & { kind: "option" } => i.kind === "option"), [items]);
  const current = value !== undefined ? String(value) : undefined;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [rect, setRect] = React.useState<{ left: number; top: number; width: number; below: boolean } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  const place = React.useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 280 < window.innerHeight || r.top < 300;
    setRect({ left: r.left, top: below ? r.bottom + 4 : r.top - 4, width: r.width, below });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    // Close when an ANCESTOR scrolls (the popup is fixed-positioned and would
    // drift) — but NOT when the user scrolls inside the popup's own list.
    const onScroll = (e: Event) => {
      if (popRef.current && popRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  function pick(v: string) {
    setOpen(false);
    if (v === current) return;
    onChange?.({ target: { value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "relative w-full appearance-none flex items-center gap-2 px-3 py-2 pr-9 rounded-[10px] bg-section text-[12px] text-ink text-left outline-none border border-border-subtle cursor-pointer transition-colors",
          open ? "border-border-default" : "hover:border-border-default",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate", selected ? "text-ink" : "text-ink-faint")}>
          {selected ? selected.label : (options[0]?.label ?? "")}
        </span>
        <ChevronDown size={14} strokeWidth={1.8} className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-transform", open && "rotate-180")} />
      </button>

      {mounted && open && rect && createPortal(
        <div
          ref={popRef}
          role="listbox"
          className="fixed z-[200] max-h-[300px] overflow-y-auto rounded-[10px] border border-border-subtle bg-surface shadow-xl shadow-black/20 py-1"
          style={{ left: rect.left, width: rect.width, ...(rect.below ? { top: rect.top } : { bottom: window.innerHeight - rect.top }) }}
        >
          {items.map((it, i) => {
            if (it.kind === "header") {
              return (
                <div key={`h-${i}`} className="px-3 pt-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint first:pt-1">
                  {it.label}
                </div>
              );
            }
            const active = it.value === current;
            return (
              <button
                key={`${it.value}-${i}`}
                type="button"
                disabled={it.disabled}
                onClick={() => pick(it.value)}
                role="option"
                aria-selected={active}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-left text-[12px] transition-colors",
                  it.disabled ? "text-ink-faint cursor-not-allowed" : "text-ink-secondary hover:bg-hover hover:text-ink",
                  active && "text-ink",
                )}
              >
                <span className="flex-1 min-w-0 truncate">{it.label}</span>
                {active && <Check size={13} className="text-accent shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {rest.name ? <input type="hidden" name={rest.name} value={current ?? ""} readOnly /> : null}
    </>
  );
}
