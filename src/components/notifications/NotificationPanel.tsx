"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, CheckCircle2, Calendar, Bell, BellOff } from "lucide-react";
import { useNotifications } from "@/providers/NotificationProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import type { AppNotification, NotificationType } from "@/types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPayInvoice?: (invoiceId: string) => void;
}

/* ── Icon by notification type ──────────────────────── */
const typeIconMap: Record<NotificationType, React.ElementType> = {
  payment_request: CreditCard,
  payment_confirmed: CheckCircle2,
  appointment_update: Calendar,
  appointment_reminder: Calendar,
  general: Bell,
};

const typeColorMap: Record<NotificationType, string> = {
  payment_request: "var(--color-warning)",
  payment_confirmed: "var(--color-success)",
  appointment_update: "var(--color-accent)",
  appointment_reminder: "var(--color-info)",
  general: "var(--color-text-secondary)",
};

/* ── Time-ago helper ────────────────────────────────── */
function getTimeAgo(
  createdAt: string,
  t: (section: "notification", key: string) => string
): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("notification", "justNow");
  if (minutes < 60) return `${minutes} ${t("notification", "minutesAgo")}`;
  if (hours < 24) return `${hours} ${t("notification", "hoursAgo")}`;
  return `${days} ${t("notification", "daysAgo")}`;
}

/* ── Single notification row ────────────────────────── */
function NotificationItem({
  notification,
  language,
  t,
  onRead,
  onPayInvoice,
}: {
  notification: AppNotification;
  language: "en" | "es";
  t: (section: "notification", key: string) => string;
  onRead: (id: string) => void;
  onPayInvoice?: (invoiceId: string) => void;
}) {
  const Icon = typeIconMap[notification.type] ?? Bell;
  const iconColor = typeColorMap[notification.type] ?? "var(--color-text-secondary)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
      className="flex gap-3 px-4 py-3 cursor-pointer"
      style={{
        background: notification.read
          ? "transparent"
          : "var(--color-bg-glass)",
        borderBottom: "1px solid var(--color-border-subtle)",
        transition: "background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-bg-glass-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = notification.read
          ? "transparent"
          : "var(--color-bg-glass)";
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          background: `color-mix(in srgb, ${iconColor} 15%, transparent)`,
          color: iconColor,
        }}
      >
        <Icon size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-medium truncate"
            style={{
              color: "var(--color-text-primary)",
              transition: "color 0.3s ease",
            }}
          >
            {notification.title[language]}
          </p>

          {/* Unread indicator dot */}
          {!notification.read && (
            <span
              className="flex-shrink-0 rounded-full mt-1.5"
              style={{
                width: 7,
                height: 7,
                background: "var(--gradient-accent)",
                boxShadow: "var(--shadow-glow)",
              }}
            />
          )}
        </div>

        <p
          className="text-xs mt-0.5 line-clamp-2"
          style={{
            color: "var(--color-text-secondary)",
            transition: "color 0.3s ease",
          }}
        >
          {notification.message[language]}
        </p>

        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {getTimeAgo(notification.createdAt, t)}
          </span>

          {/* Pay Now button for payment_request */}
          {notification.type === "payment_request" &&
            notification.invoiceId &&
            onPayInvoice && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!notification.read) onRead(notification.id);
                  onPayInvoice(notification.invoiceId!);
                }}
                className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: "var(--gradient-accent)",
                  color: "var(--color-text-inverse)",
                  boxShadow: "var(--shadow-glow)",
                  letterSpacing: "0.03em",
                  transition: "all 0.3s ease",
                }}
              >
                {t("notification", "payNow")}
              </motion.button>
            )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Panel ─────────────────────────────────────── */
export default function NotificationPanel({
  isOpen,
  onClose,
  onPayInvoice,
}: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } =
    useNotifications();
  const { language, t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] rounded-xl overflow-hidden"
          style={{
            zIndex: 50,
            background: "var(--color-bg-card)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--color-border-default)",
            boxShadow: "var(--shadow-float)",
            transition:
              "background 0.3s ease, border-color 0.3s ease",
          }}
          role="dialog"
          aria-label={t("notification", "title")}
        >
          {/* ── Header ──────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: "1px solid var(--color-border-default)",
              transition: "border-color 0.3s ease",
            }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
                transition: "color 0.3s ease",
              }}
            >
              {t("notification", "title")}
            </h3>

            {unreadCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={markAllAsRead}
                className="text-xs font-medium"
                style={{
                  color: "var(--color-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {t("notification", "markAllRead")}
              </motion.button>
            )}
          </div>

          {/* ── Notification list ───────────────────── */}
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {notifications.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="flex items-center justify-center rounded-full mb-3"
                  style={{
                    width: 48,
                    height: 48,
                    background: "var(--color-bg-glass)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <BellOff size={22} />
                </div>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--color-text-muted)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {t("notification", "noNotifications")}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    language={language}
                    t={t}
                    onRead={markAsRead}
                    onPayInvoice={onPayInvoice}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
