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
      whileHover={hover ? { y: -4, boxShadow: "0 20px 50px rgba(93, 86, 69, 0.16)" } : {}}
      onClick={onClick}
      className={cn(
        "bg-surface-card rounded-xl border border-border-default",
        "shadow-[0_1px_2px_rgba(93,86,69,0.06)]",
        "transition-all duration-300",
        hover && "cursor-pointer",
        paddings[padding],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
