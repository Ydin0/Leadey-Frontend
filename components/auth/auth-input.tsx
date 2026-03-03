import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          {label}
        </label>
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2.5 rounded-[10px] bg-section text-[13px] text-ink border border-border-subtle focus:border-accent/50 focus:outline-none placeholder:text-ink-faint transition-colors",
            error && "border-signal-red-text/50",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-signal-red-text mt-1">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
