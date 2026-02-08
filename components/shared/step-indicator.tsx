import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors",
                  isCompleted
                    ? "bg-signal-green text-signal-green-text"
                    : isCurrent
                      ? "bg-signal-blue text-signal-blue-text"
                      : "bg-section text-ink-faint"
                )}
              >
                {isCompleted ? <Check size={12} strokeWidth={2} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[12px] whitespace-nowrap",
                  isCurrent ? "font-medium text-ink" : isCompleted ? "text-ink-secondary" : "text-ink-faint"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-8 h-px", isCompleted ? "bg-signal-green-text/30" : "bg-section")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
