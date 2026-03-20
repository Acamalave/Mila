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
  Scissors,
  ShoppingCart,
  LogOut,
  UserCheck,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hydrated, logout } = useAuth();
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
    { href: "/admin/pos", icon: ShoppingCart, label: t("admin", "pos") },
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
          <nav className="absolute top-14 left-0 right-0 bg-mila-espresso border-t border-white/[0.04] p-4 space-y-1">
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
            {/* Divider + Logout */}
            <div className="my-2 border-t border-white/[0.04]" />
            <button
              onClick={() => {
                logout();
                router.push("/");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 w-full text-left"
              style={{ color: "#9B4D4D" }}
            >
              <LogOut size={18} />
              {t("nav", "logout")}
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 bg-surface-primary min-h-screen overflow-y-auto pt-20 p-6 lg:p-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
