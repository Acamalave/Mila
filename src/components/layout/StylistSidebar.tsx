"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  Users,
  Star,
  UserCircle,
  ChevronLeft,
} from "lucide-react";

export default function StylistSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: "/stylist", icon: LayoutDashboard, label: t("stylistDash", "overview") },
    { href: "/stylist/schedule", icon: CalendarDays, label: t("stylistDash", "mySchedule") },
    { href: "/stylist/earnings", icon: DollarSign, label: t("stylistDash", "myEarnings") },
    { href: "/stylist/clients", icon: Users, label: t("stylistDash", "myClients") },
    { href: "/stylist/reviews", icon: Star, label: t("stylistDash", "myReviews") },
    { href: "/stylist/profile", icon: UserCircle, label: t("stylistDash", "myProfile") },
  ];

  return (
    <aside className="w-64 bg-mila-espresso min-h-screen p-6 hidden lg:block">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-mila-taupe hover:text-mila-gold transition-colors mb-8"
      >
        <ChevronLeft size={16} />
        <span>{t("common", "backToHome")}</span>
      </Link>

      <div className="mb-8 pb-6 border-b border-white/10">
        <h2 className="text-lg font-bold tracking-[0.2em] text-mila-ivory font-[family-name:var(--font-display)]">
          MILA
        </h2>
        <p className="text-[9px] tracking-[0.5em] text-mila-gold uppercase -mt-0.5">
          Stylist
        </p>
      </div>

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
    </aside>
  );
}
