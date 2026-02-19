"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  Star,
  UserCircle,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, hydrated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  const mobileLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("dashboard", "title") },
    { href: "/dashboard/appointments", icon: CalendarDays, label: t("dashboard", "appointments") },
    { href: "/dashboard/shop", icon: ShoppingBag, label: t("dashboard", "shop") },
    { href: "/dashboard/reviews", icon: Star, label: t("dashboard", "reviews") },
    { href: "/dashboard/profile", icon: UserCircle, label: t("dashboard", "profile") },
  ];

  return (
    <div className="min-h-screen bg-surface-primary flex">
      {/* Desktop sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile nav */}
        <nav className="lg:hidden flex overflow-x-auto border-b border-border-default bg-white px-4 py-2 gap-1 scrollbar-none">
          {mobileLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-mila-gold/10 text-mila-gold"
                    : "text-text-secondary hover:bg-mila-cream"
                )}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
