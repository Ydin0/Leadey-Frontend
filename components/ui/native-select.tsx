import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native `<select>` with platform default chevron stripped and replaced
 * with a Lucide ChevronDown. Use the same className conventions as the
 * existing inputs (rounded-[10px], bg-section, etc.).
 *
 * Standard <select> props are forwarded directly. Children are <option>s.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full appearance-none px-3 py-2 pr-9 rounded-[10px] bg-section text-[12px] text-ink outline-none border border-border-subtle focus:border-signal-blue-text/30 cursor-pointer",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.8}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
      />
    </div>
  );
}
