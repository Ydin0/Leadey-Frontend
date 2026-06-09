"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";

/** Centered modal over a blurred backdrop. Ported from the design's Backdrop. */
export function Modal({
  children,
  onClose,
  maxWidth = 560,
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(6,9,20,0.6)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-[14px] border border-border-subtle w-full overflow-auto shadow-xl"
        style={{ maxWidth, maxHeight: "86vh" }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-[22px] py-[18px] border-b border-border-subtle">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-[11.5px] text-ink-faint mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
        <X size={18} />
      </button>
    </div>
  );
}
