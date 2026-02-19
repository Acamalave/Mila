"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "motion/react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: "bg-mila-gold text-white hover:bg-mila-gold-dark",
  secondary: "bg-mila-espresso text-mila-ivory hover:bg-mila-charcoal",
  outline: "border-2 border-mila-gold text-mila-gold hover:bg-mila-gold hover:text-white",
  ghost: "text-mila-olive hover:bg-mila-cream",
  danger: "bg-error text-white hover:opacity-90",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-mila-gold/50 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
