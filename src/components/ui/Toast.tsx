"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "border-success/30 bg-success/5",
  error: "border-error/30 bg-error/5",
  info: "border-info/30 bg-info/5",
};

const iconStyles = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-[0_10px_25px_rgba(93,86,69,0.12)]",
                "min-w-[300px] max-w-[400px]",
                styles[toast.type]
              )}
            >
              <Icon size={20} className={iconStyles[toast.type]} />
              <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
              <button
                onClick={() => onRemove(toast.id)}
                className="p-1 rounded-lg hover:bg-mila-cream transition-colors"
              >
                <X size={14} className="text-text-muted" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
