import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variantStyles: Record<string, CSSProperties> = {
  default: {
    background: "var(--color-accent-subtle)",
    color: "var(--color-text-secondary)",
  },
  gold: {
    background: "var(--color-accent-subtle)",
    color: "var(--color-accent)",
  },
  success: {
    background: "rgba(34, 197, 94, 0.1)",
    color: "#22c55e",
  },
  warning: {
    background: "rgba(234, 179, 8, 0.1)",
    color: "#eab308",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
  },
  info: {
    background: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
  },
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        className
      )}
      style={{
        ...variantStyles[variant],
        transition: "all 0.3s ease",
      }}
    >
      {children}
    </span>
  );
}
