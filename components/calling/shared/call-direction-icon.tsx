import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallDirection } from "@/lib/types/calling";

const config: Record<CallDirection, { icon: typeof PhoneIncoming; className: string }> = {
  inbound: { icon: PhoneIncoming, className: "text-signal-green-text" },
  outbound: { icon: PhoneOutgoing, className: "text-signal-blue-text" },
  missed: { icon: PhoneMissed, className: "text-signal-red-text" },
};

interface CallDirectionIconProps {
  direction: CallDirection;
  size?: number;
  className?: string;
}

export function CallDirectionIcon({ direction, size = 14, className }: CallDirectionIconProps) {
  const { icon: Icon, className: colorClass } = config[direction];
  return <Icon size={size} strokeWidth={1.5} className={cn(colorClass, className)} />;
}
