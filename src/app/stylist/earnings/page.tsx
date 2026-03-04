"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { DollarSign, Clock, CheckCircle } from "lucide-react";

type FilterTab = "all" | "pending" | "paid";

export default function StylistEarningsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone } = useStaff();
  const { getCommissionsForStylist, getStylistEarnings } = useCommissions();

  const [filter, setFilter] = useState<FilterTab>("all");

  const stylist = useMemo(
    () => (user?.phone ? getStylistByPhone(user.phone) : undefined),
    [user?.phone, getStylistByPhone]
  );

  const earnings = useMemo(
    () => (stylist ? getStylistEarnings(stylist.id, "all") : { total: 0, pending: 0, paid: 0 }),
    [stylist, getStylistEarnings]
  );

  const monthEarnings = useMemo(
    () => (stylist ? getStylistEarnings(stylist.id, "month") : { total: 0, pending: 0, paid: 0 }),
    [stylist, getStylistEarnings]
  );

  const commissions = useMemo(
    () => (stylist ? getCommissionsForStylist(stylist.id) : []),
    [stylist, getCommissionsForStylist]
  );

  const filteredCommissions = useMemo(
    () => (filter === "all" ? commissions : commissions.filter((c) => c.status === filter)),
    [commissions, filter]
  );

  const summaryCards = [
    {
      icon: DollarSign,
      value: formatPrice(earnings.total),
      label: t("stylistDash", "totalEarned"),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: Clock,
      value: formatPrice(earnings.pending),
      label: t("stylistDash", "pendingPayment"),
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      icon: CheckCircle,
      value: formatPrice(earnings.paid),
      label: t("stylistDash", "alreadyPaid"),
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("stylistDash", "allEarnings") },
    { key: "pending", label: t("stylistDash", "pendingOnly") },
    { key: "paid", label: t("stylistDash", "paidOnly") },
  ];

  if (!stylist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted">
          {language === "es"
            ? "No se encontro perfil de estilista."
            : "Stylist profile not found."}
        </p>
      </div>
    );
  }

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
          {t("stylistDash", "myEarnings")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Detalle de comisiones y pagos"
            : "Commission details and payments"}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", card.bg)}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {card.value}
                </p>
                <p className="text-sm text-text-secondary">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Filter Tabs + Commission Table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-4 border-b border-border-default">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  filter === tab.key
                    ? "bg-mila-gold text-white"
                    : "text-text-muted hover:text-text-primary hover:bg-mila-cream/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("stylistDash", "servicePerformed")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {t("stylistDash", "datePerformed")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden lg:table-cell">
                    {t("stylistDash", "amount")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden md:table-cell">
                    {t("stylistDash", "rate")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {t("stylistDash", "earned")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {t("stylistDash", "statusFilter")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {language === "es"
                        ? "No hay comisiones registradas"
                        : "No commissions found"}
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission) => {
                    const service = services.find(
                      (s) => s.id === commission.serviceId
                    );
                    return (
                      <tr
                        key={commission.id}
                        className="hover:bg-mila-cream/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-text-primary">
                          {service?.name[language] ?? commission.serviceId}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden md:table-cell">
                          {formatShortDate(commission.createdAt, language)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary text-right hidden lg:table-cell">
                          {formatPrice(commission.serviceAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary text-right hidden md:table-cell">
                          {commission.commissionRate}%
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                          {formatPrice(commission.commissionAmount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              commission.status === "paid"
                                ? "success"
                                : "warning"
                            }
                          >
                            {commission.status === "paid"
                              ? language === "es"
                                ? "Pagado"
                                : "Paid"
                              : language === "es"
                                ? "Pendiente"
                                : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
