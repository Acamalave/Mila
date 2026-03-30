"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Users,
  Package,
  BarChart3,
  Scissors,
  ShoppingCart,
  LogOut,
  UserCheck,
  Bell,
  X,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Luxury chime using Web Audio API
// ---------------------------------------------------------------------------
function playLuxuryChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    // Two harmonious sine waves (E5 + G#5) for a soft major-third chime
    const frequencies = [659.25, 830.61];
    const gains = [0.12, 0.08];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[i], now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + 1.0);
    });

    // Cleanup after sound finishes
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Silently ignore if audio context is unavailable
  }
}

// ---------------------------------------------------------------------------
// Admin Notification Bell component
// ---------------------------------------------------------------------------
function AdminNotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearNotification } = useNotifications();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const prevCountRef = useRef(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Play sound when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current >= 0) {
      playLuxuryChime();
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Mark all as read when opening
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev && unreadCount > 0) markAllAsRead();
      return !prev;
    });
  }, [unreadCount, markAllAsRead]);

  const recentNotifications = notifications.slice(0, 15);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return language === "es" ? "ahora" : "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "payment_confirmed": return "$";
      case "payment_request": return "$";
      case "appointment_update": return "\u2709";
      default: return "\u2022";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-1.5 text-mila-taupe hover:text-mila-gold transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-mila-gold text-[9px] font-bold text-mila-espresso leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden z-50"
          style={{
            background: "var(--color-bg-card, #1a1614)",
            borderColor: "var(--color-border-accent, rgba(196,164,118,0.15))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border-default)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--color-accent)" }}>
              {language === "es" ? "Notificaciones" : "Notifications"}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {recentNotifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 opacity-20" style={{ color: "var(--color-text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {language === "es" ? "Sin notificaciones" : "No notifications"}
                </p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--color-border-default)" }}
                >
                  {/* Type badge */}
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                    style={{
                      background: "var(--color-accent-subtle, rgba(196,164,118,0.08))",
                      color: "var(--color-accent)",
                    }}
                  >
                    {typeIcon(notif.type)}
                  </span>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {notif.title[language]}
                    </p>
                    <p className="text-[10px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                      {notif.message[language]}
                    </p>
                    <span className="text-[9px] mt-1 block" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1 rounded hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-accent)" }}
                        title={language === "es" ? "Marcar leída" : "Mark read"}
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => clearNotification(notif.id)}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-text-muted)" }}
                      title={language === "es" ? "Eliminar" : "Remove"}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SUPER_ADMIN_PHONE = "68204698";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hydrated, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const isSuperAdmin = user?.phone === SUPER_ADMIN_PHONE;
  const hasAdminAccess = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (hydrated && (!isAuthenticated || !hasAdminAccess)) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, hasAdminAccess, router]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeTabRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const scrollLeft = tab.offsetLeft - containerRect.width / 2 + tabRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [pathname]);

  if (!hydrated || !isAuthenticated || !hasAdminAccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-page)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--color-border-default)",
              borderTopColor: "var(--color-accent)",
            }}
          />
          <p
            className="text-sm"
            style={{
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: 11,
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const mobileLinks = [
    { href: "/admin", icon: LayoutDashboard, label: t("admin", "overview") },
    { href: "/admin/pos", icon: ShoppingCart, label: "POS" },
    { href: "/admin/calendar", icon: CalendarDays, label: t("admin", "calendar") },
    { href: "/admin/billing", icon: Receipt, label: t("admin", "billing") },
    { href: "/admin/staff", icon: Users, label: t("admin", "staff") },
    { href: "/admin/clients", icon: UserCheck, label: t("admin", "clients") },
    { href: "/admin/services", icon: Scissors, label: t("admin", "services") },
    { href: "/admin/products", icon: Package, label: t("admin", "products") },
    { href: "/admin/analytics", icon: BarChart3, label: t("admin", "analytics") },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile header: logo + horizontally scrollable tabs */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-mila-espresso">
        {/* Top bar: logo + logout */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-mila-brand.png" alt="Milà Concept" width={80} height={32} className="h-6 w-auto object-contain" />
            <span className="text-[9px] tracking-[0.3em] text-mila-gold uppercase font-medium px-1.5 py-0.5 rounded border border-mila-gold/30">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AdminNotificationBell />
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="p-1.5 text-mila-taupe hover:text-red-400 transition-colors"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable tab bar */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide gap-1 px-3 py-2"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mobileLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={isActive ? activeTabRef : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                  isActive
                    ? "bg-mila-gold/20 text-mila-gold border border-mila-gold/30"
                    : "text-mila-taupe hover:bg-white/5 hover:text-mila-ivory border border-transparent"
                )}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content — adjust top padding for mobile header (logo bar ~44px + tab bar ~40px = ~84px) */}
      <main className="flex-1 bg-surface-primary min-h-screen overflow-y-auto pt-[100px] p-3 lg:p-10 lg:pt-10 relative">
        {/* Desktop notification bell */}
        <div className="hidden lg:block fixed top-5 right-8 z-50">
          <AdminNotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
