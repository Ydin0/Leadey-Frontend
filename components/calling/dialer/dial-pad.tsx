"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallContext } from "@/components/calling/call-context";
import { LineSelector } from "./line-selector";

const keys = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

export function DialPad() {
  const [number, setNumber] = useState("");
  const { activeCall, selectedLineId, startCall } = useCallContext();

  const canCall = number.length > 0 && selectedLineId && !activeCall;

  function handleKeyPress(digit: string) {
    setNumber((prev) => prev + digit);
  }

  function handleCall() {
    if (!canCall) return;
    startCall(number);
    setNumber("");
  }

  return (
    <div className="space-y-3">
      <LineSelector />

      {/* Number input */}
      <input
        type="text"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Enter number..."
        className="w-full px-3 py-2 rounded-[10px] bg-section text-center text-[14px] font-medium text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30"
      />

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key.digit}
            type="button"
            onClick={() => handleKeyPress(key.digit)}
            className="flex flex-col items-center justify-center h-12 rounded-[10px] bg-section hover:bg-hover transition-colors"
          >
            <span className="text-[15px] font-medium text-ink leading-none">{key.digit}</span>
            {key.sub && (
              <span className="text-[8px] text-ink-faint tracking-widest mt-0.5">{key.sub}</span>
            )}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button
        type="button"
        onClick={handleCall}
        disabled={!canCall}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-[20px] text-[12px] font-medium transition-colors",
          canCall
            ? "bg-signal-green-text text-on-ink hover:bg-signal-green-text/90"
            : "bg-section text-ink-faint cursor-not-allowed"
        )}
      >
        <Phone size={14} strokeWidth={2} />
        Call
      </button>
    </div>
  );
}
