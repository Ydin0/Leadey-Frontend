"use client";

import { X } from "lucide-react";
import { useCallContext } from "@/components/calling/call-context";

const keys = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "*", "0", "#",
];

export function DtmfKeypad() {
  const { sendDtmf, toggleDtmfPad } = useCallContext();

  return (
    <div className="absolute inset-0 bg-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-[14px]">
      <div className="flex items-center justify-between w-full mb-3">
        <p className="text-[11px] font-medium text-ink">DTMF Keypad</p>
        <button
          type="button"
          onClick={toggleDtmfPad}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-hover transition-colors"
        >
          <X size={14} strokeWidth={1.5} className="text-ink-muted" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 w-full max-w-[180px]">
        {keys.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => sendDtmf(digit)}
            className="h-10 rounded-[8px] bg-section hover:bg-hover transition-colors text-[14px] font-medium text-ink"
          >
            {digit}
          </button>
        ))}
      </div>
    </div>
  );
}
