"use client";

import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationBellProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
}

export default function NotificationBell({
  isOpen,
  onToggle,
  unreadCount = 0,
}: NotificationBellProps) {
  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          background: isOpen
            ? "var(--color-accent-subtle)"
            : "var(--color-bg-glass)",
          border: isOpen
            ? "1px solid var(--color-border-accent)"
            : "1px solid var(--color-border-default)",
          color: isOpen
            ? "var(--color-accent)"
            : "var(--color-text-secondary)",
          transition: "all 0.3s ease",
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={16} />

        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
              }}
              className="absolute flex items-center justify-center"
              style={{
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 9,
                background: "var(--gradient-accent)",
                color: "var(--color-text-inverse)",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                lineHeight: 1,
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
