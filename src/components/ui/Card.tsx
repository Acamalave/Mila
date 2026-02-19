"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className,
  hover = false,
  onClick,
  padding = "md",
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: "var(--shadow-card-hover)" } : {}}
      onClick={onClick}
      className={cn(
        "rounded-xl",
        "transition-all duration-300",
        hover && "cursor-pointer",
        paddings[padding],
        className
      )}
      style={{
        background: "var(--color-bg-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "var(--shadow-card)",
        transition: "all 0.3s ease",
      }}
    >
      {children}
    </motion.div>
  );
}
