"use client";

import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const iconColors = {
    danger: "#ef4444",
    warning: "#D4A853",
    info: "var(--color-accent)",
  };

  const buttonStyles = {
    danger: { background: "#ef4444", hoverBg: "#dc2626" },
    warning: { background: "#D4A853", hoverBg: "#b8943e" },
    info: { background: "var(--color-accent)", hoverBg: "var(--color-accent)" },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{
                    background: `${iconColors[variant]}15`,
                    border: `1px solid ${iconColors[variant]}30`,
                  }}
                >
                  <AlertTriangle size={18} style={{ color: iconColors[variant] }} />
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {title}
                </h3>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: "var(--color-bg-glass)",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                {cancelLabel}
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: buttonStyles[variant].background,
                  color: "#fff",
                }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
