"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useService } from "@/providers/ServiceProvider";
import { getStoredData, formatPrice } from "@/lib/utils";
import Card from "@/components/ui/Card";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  BarChart3,
  CalendarDays,
  Star,
  TrendingUp,
  DollarSign,
  Award,
} from "lucide-react";
import type { Booking, Invoice } from "@/types";

export default function AdminAnalyticsPage() {
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();
  const { allServices } = useService();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    setBookings(getStoredData<Booking[]>("mila-bookings", []));
    setInvoices(getStoredData<Invoice[]>("mila-invoices", []));
  }, []);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekBookings = useMemo(
    () =>
      bookings.filter((b) => {
        if (!b.date) return false;
        const bd = new Date(`${b.date}T${b.startTime ?? "00:00"}`);
        return bd >= startOfWeek;
      }),
    [bookings, startOfWeek]
  );

  const totalRevenue = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.amount ?? 0), 0),
    [invoices]
  );

  const popularService = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      for (const sid of b.serviceIds ?? []) {
        counts.set(sid, (counts.get(sid) ?? 0) + 1);
      }
    }
    let topId = "";
    let topCount = 0;
    for (const [id, count] of counts) {
      if (count > topCount) {
        topId = id;
        topCount = count;
      }
    }
    const svc = allServices.find((s) => s.id === topId);
    return svc ? { name: svc.name[language], count: topCount } : null;
  }, [bookings, allServices, language]);

  const topStylist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      if (b.stylistId) counts.set(b.stylistId, (counts.get(b.stylistId) ?? 0) + 1);
    }
    let topId = "";
    let topCount = 0;
    for (const [id, count] of counts) {
      if (count > topCount) {
        topId = id;
        topCount = count;
      }
    }
    const st = allStylists.find((s) => s.id === topId);
    return st ? { name: st.name, count: topCount } : null;
  }, [bookings, allStylists]);

  const metrics = [
    {
      icon: CalendarDays,
      label: language === "es" ? "Citas esta semana" : "Bookings this week",
      value: weekBookings.length.toString(),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: DollarSign,
      label: language === "es" ? "Ingresos totales" : "Total revenue",
      value: formatPrice(totalRevenue),
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: Star,
      label: language === "es" ? "Servicio popular" : "Popular service",
      value: popularService?.name ?? "\u2014",
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: Award,
      label: language === "es" ? "Top estilista" : "Top stylist",
      value: topStylist?.name ?? "\u2014",
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "analytics")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es" ? "M\u00e9tricas y desempe\u00f1o" : "Metrics and performance"}
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3"
      >
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card
              key={m.label}
              className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-3"
            >
              <div className={`p-1.5 sm:p-2 rounded-xl ${m.bg}`}>
                <Icon size={14} className={`${m.color} sm:w-[18px] sm:h-[18px]`} />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <p className="text-base sm:text-lg font-bold text-text-primary truncate">
                  {m.value}
                </p>
                <p className="text-[10px] sm:text-xs text-text-secondary">{m.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-mila-gold/10">
              <TrendingUp size={18} className="text-mila-gold" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              {language === "es" ? "Resumen" : "Summary"}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">
                {language === "es" ? "Total citas" : "Total bookings"}
              </p>
              <p className="text-xl font-bold text-text-primary">{bookings.length}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">
                {language === "es" ? "Facturas pagadas" : "Paid invoices"}
              </p>
              <p className="text-xl font-bold text-text-primary">
                {invoices.filter((i) => i.status === "paid").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">
                {language === "es" ? "Estilistas activos" : "Active stylists"}
              </p>
              <p className="text-xl font-bold text-text-primary">{allStylists.length}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-mila-gold" />
            <p className="text-sm text-text-secondary">
              {language === "es"
                ? "An\u00e1lisis detallado y gr\u00e1ficos avanzados pr\u00f3ximamente."
                : "Detailed analytics and advanced charts coming soon."}
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
