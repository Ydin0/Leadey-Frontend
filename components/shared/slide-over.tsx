"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  /** Max-width utility for the panel (e.g. "max-w-md", "max-w-[560px]"). */
  width?: string;
  /** Panel background; defaults to an elevated surface above the scrim. */
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * Right-anchored drawer with a soft, dark scrim and a smooth slide/fade. Stays
 * mounted through the exit animation, locks body scroll, and closes on Escape
 * or backdrop click. Shared by the SMS and email composers so both feel polished
 * and consistent (and never flash the washed-out `bg-ink` overlay in dark mode).
 */
export function SlideOver({
  open,
  onClose,
  width = "max-w-md",
  panelClassName = "bg-surface",
  children,
}: SlideOverProps) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);

  // Mount → next frame → animate in. Close → animate out → unmount. All state
  // updates happen inside rAF/timeout callbacks (never synchronously in the
  // effect body) so opening/closing can't trigger cascading renders.
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      raf1 = requestAnimationFrame(() => {
        setRender(true);
        raf2 = requestAnimationFrame(() => setShown(true));
      });
    } else {
      raf1 = requestAnimationFrame(() => setShown(false));
      timer = setTimeout(() => setRender(false), 300);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [render, onClose]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Scrim — a real dark veil + blur (theme-safe), not a light bg-ink wash. */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[3px] transition-opacity duration-300 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Panel — slides in from the right with an expo-out ease. */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full flex flex-col border-l border-border-default shadow-2xl",
          "transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
          width,
          panelClassName,
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
