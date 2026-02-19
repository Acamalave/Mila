"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  Star,
  UserCircle,
  ChevronLeft,
} from "lucide-react";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  const links = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("dashboard", "title") },
    { href: "/dashboard/appointments", icon: CalendarDays, label: t("dashboard", "appointments") },
    { href: "/dashboard/shop", icon: ShoppingBag, label: t("dashboard", "shop") },
    { href: "/dashboard/reviews", icon: Star, label: t("dashboard", "reviews") },
    { href: "/dashboard/profile", icon: UserCircle, label: t("dashboard", "profile") },
  ];

  return (
    <aside className="w-64 bg-white border-r border-border-default min-h-screen p-6 hidden lg:block">
      {/* Back to home */}
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-text-muted hover:text-mila-gold transition-colors mb-8"
      >
        <ChevronLeft size={16} />
        {t("common", "backToHome")}
      </Link>

      {/* User info */}
      <div className="mb-8 pb-6 border-b border-border-default">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
          {t("dashboard", "welcome")}
        </p>
        <p className="font-semibold text-text-primary font-[family-name:var(--font-display)]">
          {user?.name}
        </p>
      </div>

      {/* Nav links */}
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-mila-gold/10 text-mila-gold font-medium"
                  : "text-text-secondary hover:bg-mila-cream hover:text-text-primary"
              )}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
