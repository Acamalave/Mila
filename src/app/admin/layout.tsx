"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Users,
  Package,
  BarChart3,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hydrated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.role !== "admin")) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, user, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!hydrated || !isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const mobileLinks = [
    { href: "/admin", icon: LayoutDashboard, label: t("admin", "overview") },
    { href: "/admin/calendar", icon: CalendarDays, label: t("admin", "calendar") },
    { href: "/admin/billing", icon: Receipt, label: t("admin", "billing") },
    { href: "/admin/staff", icon: Users, label: t("admin", "staff") },
    { href: "/admin/products", icon: Package, label: t("admin", "products") },
    { href: "/admin/analytics", icon: BarChart3, label: t("admin", "analytics") },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-mila-espresso px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-[0.2em] text-mila-ivory font-[family-name:var(--font-display)]">
            MILA
          </h2>
          <p className="text-[8px] tracking-[0.5em] text-mila-gold uppercase -mt-1">
            Admin
          </p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-mila-ivory hover:text-mila-gold transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-mila-espresso/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="absolute top-14 left-0 right-0 bg-mila-espresso border-t border-white/10 p-4 space-y-1">
            {mobileLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-mila-gold/15 text-mila-gold font-medium"
                      : "text-mila-taupe hover:bg-white/5 hover:text-mila-ivory"
                  )}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 bg-surface-primary min-h-screen overflow-y-auto pt-16 lg:pt-0 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
