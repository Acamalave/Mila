"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "motion/react";
import type { CSSProperties } from "react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: "var(--gradient-accent)",
    color: "var(--color-text-inverse)",
    border: "none",
  },
  secondary: {
    background: "var(--color-bg-glass)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-default)",
  },
  outline: {
    background: "transparent",
    color: "var(--color-accent)",
    border: "2px solid var(--color-accent)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    border: "none",
  },
  danger: {
    background: "#9B4D4D",
    color: "#FAF8F5",
    border: "none",
  },
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer",
        sizes[size],
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        ...variantStyles[variant],
        transition: "all 0.3s ease",
        boxShadow: variant === "primary" ? "var(--shadow-glow)" : undefined,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
