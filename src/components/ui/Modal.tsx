"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const modalSizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{
              background: "var(--color-bg-overlay)",
              backdropFilter: "blur(4px)",
              transition: "all 0.3s ease",
            }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full",
              "rounded-t-2xl sm:rounded-2xl",
              "max-h-[90vh] sm:max-h-[85vh] overflow-y-auto",
              modalSizes[size]
            )}
            style={{
              background: "var(--color-bg-card)",
              boxShadow: "var(--shadow-float, 0 -10px 40px rgba(0, 0, 0, 0.3), 0 20px 50px rgba(0, 0, 0, 0.5))",
              border: "1px solid var(--color-border-default)",
              transition: "all 0.3s ease",
            }}
          >
            {title && (
              <div
                className="flex items-center justify-between p-6"
                style={{
                  borderBottom: "1px solid var(--color-border-default)",
                  transition: "all 0.3s ease",
                }}
              >
                <h3
                  className="text-xl font-semibold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-primary)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color: "var(--color-text-muted)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-glass-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="p-4 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
