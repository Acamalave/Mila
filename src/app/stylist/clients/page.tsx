"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { getStoredData } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Users } from "lucide-react";
import type { Booking } from "@/types";

interface ClientSummary {
  name: string;
  totalVisits: number;
  lastVisit: string;
  services: string[];
}

export default function StylistClientsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone } = useStaff();

  const stylist = user?.phone ? getStylistByPhone(user.phone) : undefined;

  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    setBookings(stored);
  }, []);

  const myBookings = useMemo(
    () => (stylist ? bookings.filter((b) => b.stylistId === stylist.id) : []),
    [bookings, stylist]
  );

  const clients = useMemo(() => {
    const map = new Map<string, ClientSummary>();

    for (const booking of myBookings) {
      const key =
        booking.clientId ??
        (booking.guestName && booking.guestPhone
          ? `${booking.guestName}::${booking.guestPhone}`
          : null);

      if (!key) continue;

      const existing = map.get(key);

      if (existing) {
        existing.totalVisits += 1;
        if (booking.date > existing.lastVisit) {
          existing.lastVisit = booking.date;
        }
        for (const svcId of booking.serviceIds) {
          if (!existing.services.includes(svcId)) {
            existing.services.push(svcId);
          }
        }
      } else {
        map.set(key, {
          name: booking.guestName || booking.clientId || "Unknown",
          totalVisits: 1,
          lastVisit: booking.date,
          services: [...booking.serviceIds],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      b.lastVisit.localeCompare(a.lastVisit)
    );
  }, [myBookings]);

  const getServiceName = (svcId: string) =>
    services.find((s) => s.id === svcId)?.name[language as "en" | "es"] ?? svcId;

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
          {t("stylistDash", "myClients")}
        </h1>
        <p className="text-text-secondary mt-1">
          {t("stylistDash", "totalClients")}: {clients.length}
        </p>
      </motion.div>

      {/* Client cards */}
      {clients.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-mila-gold/10 mb-4">
              <Users size={32} className="text-mila-gold" />
            </div>
            <p className="text-text-muted text-lg">
              {t("stylistDash", "noClients")}
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {clients.map((client, idx) => (
            <Card key={`${client.name}-${idx}`} className="flex flex-col gap-3">
              {/* Client name */}
              <h3 className="text-lg font-semibold text-text-primary">
                {client.name}
              </h3>

              {/* Last visit */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {t("stylistDash", "lastVisit")}
                </span>
                <span className="text-text-primary font-medium">
                  {formatShortDate(client.lastVisit, language)}
                </span>
              </div>

              {/* Total visits */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {t("stylistDash", "totalVisits")}
                </span>
                <span className="text-text-primary font-medium">
                  {client.totalVisits}
                </span>
              </div>

              {/* Favorite services */}
              <div className="pt-2 border-t border-border-default">
                <p className="text-xs text-text-muted mb-2">
                  {t("stylistDash", "favoriteServices")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {client.services.map((svcId) => (
                    <span
                      key={svcId}
                      className="inline-block text-xs px-2 py-0.5 rounded-full bg-mila-gold/10 text-mila-gold font-medium"
                    >
                      {getServiceName(svcId)}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
