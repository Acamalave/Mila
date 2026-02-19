"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn, formatPrice, getStoredData } from "@/lib/utils";
import { services, serviceCategories } from "@/data/services";
import { stylists } from "@/data/stylists";
import { reviews as mockReviews } from "@/data/reviews";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  CalendarDays,
  Star,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import type { Booking } from "@/types";

const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_ES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default function AdminAnalyticsPage() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    setBookings(stored);
  }, []);

  // Bookings this week
  const bookingsThisWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayDiff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDiff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split("T")[0];
    const sundayStr = sunday.toISOString().split("T")[0];

    return bookings.filter(
      (b) => b.date >= mondayStr && b.date <= sundayStr
    ).length;
  }, [bookings]);

  // Average rating
  const averageRating = useMemo(() => {
    if (mockReviews.length === 0) return 0;
    const sum = mockReviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / mockReviews.length).toFixed(1));
  }, []);

  // Most popular service
  const mostPopularService = useMemo(() => {
    const countMap: Record<string, number> = {};
    bookings.forEach((b) => {
      (b.serviceIds ?? []).forEach((svcId) => {
        countMap[svcId] = (countMap[svcId] || 0) + 1;
      });
    });
    const topServiceId = Object.entries(countMap).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    return services.find((s) => s.id === topServiceId) || null;
  }, [bookings]);

  // Top stylist (by number of bookings)
  const topStylist = useMemo(() => {
    const countMap: Record<string, number> = {};
    bookings.forEach((b) => {
      countMap[b.stylistId] = (countMap[b.stylistId] || 0) + 1;
    });
    const topStylistId = Object.entries(countMap).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    return stylists.find((s) => s.id === topStylistId) || null;
  }, [bookings]);

  // Revenue by service category
  const revenueByCategory = useMemo(() => {
    const catRevenue: Record<string, number> = {};
    serviceCategories.forEach((cat) => {
      catRevenue[cat.id] = 0;
    });

    bookings
      .filter(
        (b) => b.status === "confirmed" || b.status === "completed"
      )
      .forEach((b) => {
        const svcIds = b.serviceIds ?? [];
        const share = svcIds.length > 0 ? b.totalPrice / svcIds.length : 0;
        svcIds.forEach((svcId) => {
          const service = services.find((s) => s.id === svcId);
          if (service) {
            catRevenue[service.categoryId] =
              (catRevenue[service.categoryId] || 0) + share;
          }
        });
      });

    const maxRevenue = Math.max(...Object.values(catRevenue), 1);

    return serviceCategories.map((cat) => ({
      id: cat.id,
      name: cat.name[language],
      revenue: catRevenue[cat.id] || 0,
      percent: Math.round(((catRevenue[cat.id] || 0) / maxRevenue) * 100),
    }));
  }, [bookings, language]);

  // Bookings per day of week
  const bookingsPerDay = useMemo(() => {
    // counts indexed 0=Mon .. 6=Sun
    const counts = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach((b) => {
      const d = new Date(b.date);
      const jsDay = d.getDay(); // 0=Sun
      const idx = jsDay === 0 ? 6 : jsDay - 1; // shift to Mon=0
      counts[idx]++;
    });

    const max = Math.max(...counts, 1);
    const dayNames = language === "es" ? DAY_NAMES_ES : DAY_NAMES_EN;

    return counts.map((count, i) => ({
      day: dayNames[i],
      count,
      percent: Math.round((count / max) * 100),
    }));
  }, [bookings, language]);

  const metricCards = [
    {
      icon: CalendarDays,
      value: bookingsThisWeek,
      label:
        language === "es"
          ? "Reservas esta semana"
          : "Bookings This Week",
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: Star,
      value: averageRating,
      label:
        language === "es"
          ? "Calificacion Promedio"
          : "Average Rating",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      icon: TrendingUp,
      value: mostPopularService
        ? mostPopularService.name[language]
        : "---",
      label:
        language === "es"
          ? "Servicio Mas Popular"
          : "Most Popular Service",
      color: "text-success",
      bg: "bg-success/10",
      isText: true,
    },
    {
      icon: Award,
      value: topStylist ? topStylist.name : "---",
      label:
        language === "es"
          ? "Estilista Destacada"
          : "Top Stylist",
      color: "text-info",
      bg: "bg-info/10",
      isText: true,
    },
  ];

  const barColors = [
    "bg-mila-gold",
    "bg-success",
    "bg-info",
    "bg-warning",
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "analytics")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Metricas y tendencias del salon"
            : "Salon metrics and trends"}
        </p>
      </motion.div>

      {/* Metric cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", card.bg)}>
                <Icon size={22} className={card.color} />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-bold text-text-primary truncate",
                    card.isText ? "text-base" : "text-2xl"
                  )}
                >
                  {card.value}
                </p>
                <p className="text-sm text-text-secondary">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by category */}
        <motion.div variants={fadeInUp}>
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={18} className="text-mila-gold" />
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
                {language === "es"
                  ? "Ingresos por Categoria"
                  : "Revenue by Category"}
              </h2>
            </div>

            <div className="space-y-4">
              {revenueByCategory.map((cat, i) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">
                      {cat.name}
                    </span>
                    <span className="text-sm font-medium text-text-secondary">
                      {formatPrice(cat.revenue)}
                    </span>
                  </div>
                  <div className="h-3 bg-mila-cream rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percent}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "h-full rounded-full",
                        barColors[i % barColors.length]
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Bookings per day of week */}
        <motion.div variants={fadeInUp}>
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays size={18} className="text-mila-gold" />
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
                {language === "es"
                  ? "Reservas por Dia"
                  : "Bookings by Day"}
              </h2>
            </div>

            <div className="flex items-end justify-between gap-2 h-48">
              {bookingsPerDay.map((day, i) => (
                <div
                  key={day.day}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium text-text-primary">
                    {day.count}
                  </span>
                  <div className="w-full bg-mila-cream rounded-t-lg overflow-hidden flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(day.percent, 5)}%` }}
                      transition={{
                        duration: 0.8,
                        delay: 0.2 + i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={cn(
                        "w-full rounded-t-lg",
                        i === 4 || i === 5
                          ? "bg-mila-gold"
                          : "bg-mila-gold/60"
                      )}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{day.day}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top stylist card */}
      {topStylist && (
        <motion.div variants={fadeInUp}>
          <Card className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              src={topStylist.avatar}
              alt={topStylist.name}
              size="xl"
            />
            <div className="text-center sm:text-left">
              <Badge variant="gold" className="mb-2">
                {language === "es" ? "Estilista del Mes" : "Stylist of the Month"}
              </Badge>
              <h3 className="text-xl font-semibold text-text-primary">
                {topStylist.name}
              </h3>
              <p className="text-text-secondary">
                {topStylist.role[language]}
              </p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <Star
                  size={16}
                  className="text-warning fill-warning"
                />
                <span className="text-sm font-medium text-text-primary">
                  {topStylist.rating}
                </span>
                <span className="text-sm text-text-muted">
                  ({topStylist.reviewCount}{" "}
                  {language === "es" ? "resenas" : "reviews"})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                {topStylist.specialties.map((spec) => (
                  <Badge key={spec} variant="default">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
