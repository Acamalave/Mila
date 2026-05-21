"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import AccountantSidebar from "@/components/layout/AccountantSidebar";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  FileText,
  LogOut,
} from "lucide-react";

export default function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hydrated, logout } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth guard — only "accountant" can stay. Anything else (admin, stylist,
  // client, unauthenticated) gets sent home or to login.
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user?.role !== "accountant") {
      router.replace("/");
    }
  }, [hydrated, isAuthenticated, user, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    return lockBodyScroll();
  }, [mobileMenuOpen]);

  if (!hydrated || !isAuthenticated || user?.role !== "accountant") {
    return null;
  }

  const mobileLinks = [
    {
      href: "/accountant",
      icon: LayoutDashboard,
      label: language === "es" ? "Resumen" : "Overview",
    },
    {
      href: "/accountant/invoices",
      icon: FileText,
      label: language === "es" ? "Facturas" : "Invoices",
    },
    {
      href: "/accountant/expenses",
      icon: Receipt,
      label: language === "es" ? "Gastos" : "Expenses",
    },
  ];

  return (
    <div className="min-h-screen">
      <AccountantSidebar />

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-mila-espresso px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-mila-brand.png"
            alt="Milà Concept"
            width={80}
            height={32}
            className="h-6 w-auto object-contain"
          />
          <span className="text-[9px] tracking-[0.3em] text-mila-gold uppercase font-medium px-1.5 py-0.5 rounded border border-mila-gold/30">
            {language === "es" ? "Contador" : "Accountant"}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-mila-ivory hover:text-mila-gold transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

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
            <div className="pt-4 mt-4 border-t border-white/[0.04]">
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 w-full text-left"
                style={{ color: "#9B4D4D" }}
              >
                <LogOut size={18} />
                {t("nav", "logout")}
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="bg-surface-primary pt-16 lg:pt-8 p-6 lg:p-8 lg:ml-64">
        {children}
      </main>
    </div>
  );
}
