"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  DollarSign,
  ChevronLeft,
  LogOut,
} from "lucide-react";

export default function StylistSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { logout } = useAuth();

  // Deliberately trimmed to the two surfaces stylists actually use:
  // earnings (their landing page) and their schedule. /stylist redirects
  // to /stylist/earnings, so no dashboard/overview entry.
  const links = [
    { href: "/stylist/earnings", icon: DollarSign, label: t("stylistDash", "myEarnings") },
    { href: "/stylist/schedule", icon: CalendarDays, label: t("stylistDash", "mySchedule") },
  ];

  return (
    <aside className="w-64 bg-mila-espresso p-6 hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:overflow-y-auto lg:z-30">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-mila-taupe hover:text-mila-gold transition-colors mb-8"
      >
        <ChevronLeft size={16} />
        <span>{t("common", "backToHome")}</span>
      </Link>

      <div className="mb-8 pb-6 border-b border-white/10">
        <Image src="/logo-mila-brand.png" alt="Milà Concept" width={100} height={40} className="h-8 w-auto object-contain mb-1" />
        <p className="text-[9px] tracking-[0.5em] text-mila-gold uppercase">
          Stylist
        </p>
      </div>

      <nav className="space-y-1 flex-1">
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

      <div className="pt-6 mt-6 border-t border-white/[0.04]">
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 w-full text-left text-mila-taupe hover:bg-white/5"
          style={{ color: "#9B4D4D" }}
        >
          <LogOut size={18} />
          {t("nav", "logout")}
        </button>
      </div>
    </aside>
  );
}
