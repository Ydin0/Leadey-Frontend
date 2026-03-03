import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-[14px] border border-border-subtle p-8 w-full max-w-[400px]",
        className
      )}
    >
      <h1 className="text-[17px] font-semibold text-ink text-center">{title}</h1>
      {subtitle && (
        <p className="text-[13px] text-ink-muted text-center mt-1">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}
