"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn, formatPrice, getStoredData } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Users, Search, Phone, Mail, CalendarDays, DollarSign, Star } from "lucide-react";
import { getInitialDemoAppointments } from "@/data/appointments";
import { useStaff } from "@/providers/StaffProvider";
import { services } from "@/data/services";
import { onCollectionChange } from "@/lib/firestore";
import type { User, Booking, Review, Invoice } from "@/types";

export default function AdminClientsPage() {
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();

  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Load local data first for instant display
    const storedUsers = getStoredData<User[]>("mila-users", []);
    setUsers(storedUsers);

    let storedBookings = getStoredData<Booking[]>("mila-bookings", []);
    if (storedBookings.length === 0) {
      storedBookings = getInitialDemoAppointments();
    }
    setBookings(storedBookings);

    const storedInvoices = getStoredData<Invoice[]>("mila-invoices", []);
    setInvoices(storedInvoices);

    // Subscribe to Firestore real-time updates for users
    const unsubUsers = onCollectionChange<User>("users", (firestoreUsers) => {
      if (firestoreUsers.length > 0) {
        // Merge: Firestore is source of truth, but keep local-only users
        const localUsers = getStoredData<User[]>("mila-users", []);
        const merged = new Map<string, User>();
        for (const u of localUsers) merged.set(u.id, u);
        for (const u of firestoreUsers) merged.set(u.id, u);
        const allUsers = Array.from(merged.values());
        setUsers(allUsers);
      }
    });

    return () => unsubUsers();
  }, []);

  // Filter out invalid/empty user entries and deduplicate by phone
  const validUsers = useMemo(() => {
    const seen = new Map<string, User>();
    for (const u of users) {
      if (!u.id || !u.name || !u.phone) continue;
      const key = u.phone;
      if (!seen.has(key) || (u.createdAt && !seen.get(key)!.createdAt)) {
        seen.set(key, u);
      }
    }
    return Array.from(seen.values());
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return validUsers;
    const q = search.toLowerCase();
    return validUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }, [validUsers, search]);

  const getUserBookings = (userId: string) =>
    bookings.filter((b) => b.clientId === userId);

  const getUserSpent = (userId: string) =>
    invoices
      .filter((inv) => inv.clientId === userId && inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);

  const totalRevenue = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );

  const getServiceNames = (svcIds: string[] | undefined) => {
    if (!svcIds || svcIds.length === 0)
      return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds
      .map((id) => services.find((s) => s.id === id)?.name[language] ?? id)
      .join(", ");
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "completed":
        return "gold";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      case "no-show":
        return "error";
      default:
        return "default";
    }
  };

  const statCards = [
    {
      icon: Users,
      value: validUsers.length,
      label: t("admin", "clients"),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: DollarSign,
      value: formatPrice(totalRevenue),
      label: t("admin", "totalRevenue"),
      color: "text-success",
      bg: "bg-success/10",
    },
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
          {t("admin", "clients")}
        </h1>
        <p className="text-text-secondary mt-1">
          {t("admin", "clientsSubtitle")}
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <Icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeInUp}>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={t("common", "search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
            style={{
              background: "var(--color-bg-input)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
      </motion.div>

      {/* Clients table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Nombre" : "Name"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    <Phone size={14} className="inline mr-1" />
                    {language === "es" ? "Teléfono" : "Phone"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Rol" : "Role"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("admin", "appointmentHistory")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {t("admin", "totalSpent")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {t("admin", "registeredOn")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {t("admin", "noClients")}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const userBookings = getUserBookings(user.id);
                    const spent = getUserSpent(user.id);
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={user.avatar}
                              alt={user.name}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                {user.name}
                              </p>
                              <p className="text-xs text-text-muted lg:hidden">
                                {user.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell">
                          {user.phone}
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <Badge
                            variant={
                              user.role === "admin"
                                ? "gold"
                                : user.role === "stylist"
                                ? "success"
                                : "default"
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {userBookings.length}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary hidden lg:table-cell">
                          {formatPrice(spent)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell">
                          {user.createdAt ? formatShortDate(user.createdAt, language) : "—"}
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

      {/* Client detail modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={t("admin", "clientDetails")}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User info */}
            <div className="flex items-start gap-4">
              <Avatar
                src={selectedUser.avatar}
                alt={selectedUser.name}
                size="lg"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg font-semibold text-text-primary">
                  {selectedUser.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone size={14} className="text-text-muted" />
                  {selectedUser.phone}
                </div>
                {selectedUser.email && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail size={14} className="text-text-muted" />
                    {selectedUser.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CalendarDays size={14} className="text-text-muted" />
                  {t("admin", "registeredOn")}:{" "}
                  {selectedUser.createdAt ? formatShortDate(selectedUser.createdAt, language) : "—"}
                </div>
                <Badge
                  variant={
                    selectedUser.role === "admin"
                      ? "gold"
                      : selectedUser.role === "stylist"
                      ? "success"
                      : "default"
                  }
                >
                  {selectedUser.role}
                </Badge>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-mila-gold/10">
                  <CalendarDays size={18} className="text-mila-gold" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {getUserBookings(selectedUser.id).length}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("admin", "appointmentHistory")}
                  </p>
                </div>
              </Card>
              <Card className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign size={18} className="text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {formatPrice(getUserSpent(selectedUser.id))}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("admin", "totalSpent")}
                  </p>
                </div>
              </Card>
            </div>

            {/* Appointment history */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">
                {t("admin", "appointmentHistory")}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getUserBookings(selectedUser.id).length === 0 ? (
                  <p className="text-sm text-text-muted py-4 text-center">
                    {language === "es"
                      ? "Sin citas registradas"
                      : "No appointments recorded"}
                  </p>
                ) : (
                  getUserBookings(selectedUser.id)
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border-default"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {getServiceNames(booking.serviceIds)}
                          </p>
                          <p className="text-xs text-text-muted">
                            {formatShortDate(booking.date, language)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <Badge variant={statusBadgeVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                          <span className="text-sm font-medium text-text-primary whitespace-nowrap">
                            {formatPrice(booking.totalPrice)}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Close button */}
            <div className="flex justify-end pt-2 border-t border-border-default">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                {t("common", "close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
