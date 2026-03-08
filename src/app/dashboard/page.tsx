"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { getStoredData, setStoredData, formatPrice, cn } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { useStaff } from "@/providers/StaffProvider";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/providers/ToastProvider";
import { useProducts } from "@/providers/ProductProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking, Invoice } from "@/types";
import type { Variants } from "motion/react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StarRating from "@/components/ui/StarRating";
import PaymentModal from "@/components/payment/PaymentModal";
import {
  CalendarDays,
  CalendarPlus,
  ShoppingBag,
  Star,
  UserCircle,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
} from "lucide-react";

/* ── Shared glass style ─────────────────────────────────────────── */
const glassCard: React.CSSProperties = {
  background: "var(--color-bg-glass)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--color-border-default)",
  borderRadius: 20,
  boxShadow: "var(--shadow-card)",
  transition: "all 0.3s ease",
};

const glassCardHover: React.CSSProperties = {
  ...glassCard,
  cursor: "pointer",
};

/* ── Colors ─────────────────────────────────────────────────────── */
const colors = {
  primary: "var(--color-text-primary)",
  secondary: "var(--color-text-secondary)",
  muted: "var(--color-text-muted)",
  gold: "var(--color-accent)",
  darkGold: "var(--color-accent-dark)",
  bg: "var(--color-bg-page)",
};

/* ── Animations ─────────────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const cardSpring = {
  whileHover: { scale: 1.04, boxShadow: "var(--shadow-card-hover)" },
  whileTap: { scale: 0.97 },
};

const SHOP_CATEGORIES = [
  { value: "all", labelEn: "All", labelEs: "Todos" },
  { value: "hair-care", labelEn: "Hair Care", labelEs: "Cabello" },
  { value: "skin-care", labelEn: "Skin Care", labelEs: "Piel" },
  { value: "styling", labelEn: "Styling", labelEs: "Estilizado" },
  { value: "tools", labelEn: "Tools", labelEs: "Herramientas" },
];

/* ── Component ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();
  const { items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice: cartTotal } = useCart();
  const { addToast } = useToast();
  const { allProducts } = useProducts();
  const { invoices, addInvoice } = useInvoices();
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"shop" | "appointments">("shop");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [prevInvoicesLen, setPrevInvoicesLen] = useState(0);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
      setStoredData("mila-bookings", stored);
    }
    setAppointments(stored);
  }, []);

  // Track invoices for checkout flow
  useEffect(() => {
    if (invoices.length > prevInvoicesLen && user) {
      const latestForUser = [...invoices]
        .filter((inv) => inv.clientId === user.id)
        .pop();
      if (latestForUser && latestForUser.status === "sent") {
        setCheckoutInvoice(latestForUser);
        setShowPayment(true);
      }
    }
    setPrevInvoicesLen(invoices.length);
  }, [invoices, user, prevInvoicesLen]);

  const visibleProducts = allProducts.filter((p) => !p.hidden);
  const filteredProducts =
    activeCategory === "all"
      ? visibleProducts
      : visibleProducts.filter((p) => p.category === activeCategory);

  function handleAddToCart(productId: string) {
    addItem(productId);
    addToast(language === "es" ? "Agregado al carrito" : "Added to cart", "success");
  }

  function handleCheckout() {
    if (!user) return;
    addInvoice({
      clientId: user.id,
      clientName: user.name,
      amount: cartTotal,
      status: "sent",
      date: new Date().toISOString().split("T")[0],
      sentAt: new Date().toISOString(),
      description: language === "es" ? "Compra de productos en Mila Shop" : "Product purchase from Mila Shop",
    });
    setCartOpen(false);
  }

  function handlePaymentComplete() {
    clearCart();
    setShowPayment(false);
    setCheckoutInvoice(null);
    addToast(language === "es" ? "Pedido procesado con éxito" : "Order processed successfully", "success");
  }

  /* ── Derived data ───────────────────────────────────────────── */
  const now = new Date();
  const upcoming = appointments
    .filter((a) => {
      const apptDate = new Date(`${a.date}T${a.startTime}`);
      return apptDate > now && a.status !== "cancelled";
    })
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.startTime}`).getTime() -
        new Date(`${b.date}T${b.startTime}`).getTime()
    );

  const nextAppointment = upcoming[0] ?? null;
  const restUpcoming = upcoming.slice(1, 4);

  /* ── Helpers ────────────────────────────────────────────────── */
  const statusVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success" as const;
      case "pending":
        return "warning" as const;
      case "cancelled":
        return "error" as const;
      case "completed":
        return "info" as const;
      default:
        return "default" as const;
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      confirmed: { es: "Confirmada", en: "Confirmed" },
      pending: { es: "Pendiente", en: "Pending" },
      cancelled: { es: "Cancelada", en: "Cancelled" },
      completed: { es: "Completada", en: "Completed" },
    };
    return labels[status]?.[language] ?? status;
  };

  const getServiceNames = (appt: Booking): string => {
    const svcIds = appt.serviceIds ?? [];
    if (svcIds.length === 0)
      return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds
      .map((id) => services.find((s) => s.id === id)?.name[language] ?? id)
      .join(", ");
  };

  /* ── Navigation cards config ────────────────────────────────── */
  const navCards = [
    {
      href: "/dashboard/appointments",
      icon: CalendarDays,
      label: language === "es" ? "Mis Citas" : "My Appointments",
      accent: false,
    },
    {
      href: "/",
      icon: CalendarPlus,
      label: language === "es" ? "Reservar Nueva" : "Book New",
      accent: true,
    },
    {
      href: "/dashboard/reviews",
      icon: Star,
      label: language === "es" ? "Rese\u00f1as" : "Reviews",
      accent: false,
    },
    {
      href: "/dashboard/profile",
      icon: UserCircle,
      label: language === "es" ? "Mi Perfil" : "My Profile",
      accent: false,
    },
  ];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* ─── Welcome Section ─────────────────────────────────── */}
      <motion.div variants={itemVariants} className="pt-1">
        <h1
          className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]"
          style={{ color: colors.primary }}
        >
          {user?.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.secondary }}>
          {language === "es" ? "Qué bueno que estás aquí" : "So glad you're here"}
        </p>
      </motion.div>

      {/* ─── Hero Reservation Card ───────────────────────────── */}
      <motion.section variants={itemVariants}>
        {nextAppointment ? (
          <ReservationHeroCard
            appointment={nextAppointment}
            language={language}
            getServiceNames={getServiceNames}
            statusVariant={statusVariant}
            statusLabel={statusLabel}
          />
        ) : (
          <EmptyReservationCard language={language} />
        )}
      </motion.section>

      {/* ─── Navigation Grid ─────────────────────────────────── */}
      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {navCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  whileHover={cardSpring.whileHover}
                  whileTap={cardSpring.whileTap}
                  className="flex flex-col items-center justify-center gap-3 p-5"
                  style={
                    card.accent
                      ? {
                          ...glassCardHover,
                          background: "var(--color-bg-glass-selected)",
                          border: "1px solid var(--color-border-accent)",
                        }
                      : glassCardHover
                  }
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: card.accent
                        ? "var(--color-accent-subtle)"
                        : "var(--color-bg-glass)",
                      border: card.accent
                        ? "1px solid var(--color-border-accent)"
                        : "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <Icon
                      size={24}
                      style={{
                        color: card.accent ? colors.gold : colors.secondary,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium text-center leading-tight"
                    style={{
                      color: card.accent ? colors.gold : colors.primary,
                    }}
                  >
                    {card.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* ─── Tabs: Shop / Appointments ────────────────────────── */}
      <motion.section variants={itemVariants}>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("shop")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              activeTab === "shop"
                ? "text-white"
                : "text-text-secondary"
            )}
            style={{
              background: activeTab === "shop" ? "var(--gradient-accent)" : "var(--color-bg-glass)",
              border: activeTab === "shop" ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
              cursor: "pointer",
            }}
          >
            <ShoppingBag size={16} />
            {language === "es" ? "Tienda" : "Shop"}
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              activeTab === "appointments"
                ? "text-white"
                : "text-text-secondary"
            )}
            style={{
              background: activeTab === "appointments" ? "var(--gradient-accent)" : "var(--color-bg-glass)",
              border: activeTab === "appointments" ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
              cursor: "pointer",
            }}
          >
            <CalendarDays size={16} />
            {language === "es" ? "Citas" : "Appointments"}
          </button>
        </div>

        {/* ─── Shop Content ─────────────────────────────── */}
        {activeTab === "shop" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Category filter */}
            <div className="flex overflow-x-auto gap-2 pb-1">
              {SHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200"
                  style={{
                    background: activeCategory === cat.value ? "var(--gradient-accent)" : "var(--color-bg-glass)",
                    color: activeCategory === cat.value ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                    border: activeCategory === cat.value ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                    cursor: "pointer",
                  }}
                >
                  {language === "es" ? cat.labelEs : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className="overflow-hidden h-full flex flex-col"
                    style={glassCard}
                  >
                    <div className="relative aspect-square" style={{ background: "var(--color-bg-glass)" }}>
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                      {product.discount && product.discount > 0 && (
                        <div
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                          }}
                        >
                          -{product.discount}%
                        </div>
                      )}
                      {product.featured && (
                        <div
                          className="absolute top-2 right-2 flex items-center justify-center"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "var(--color-accent-subtle)",
                            border: "1px solid var(--color-border-accent)",
                          }}
                        >
                          <Sparkles size={10} style={{ color: colors.gold }} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.muted }}>
                        {product.brand}
                      </p>
                      <p className="font-semibold text-xs mt-1 line-clamp-2 flex-1" style={{ color: colors.primary }}>
                        {product.name}
                      </p>
                      <StarRating rating={product.rating} size={10} className="mt-1.5" />
                      <div className="flex items-center justify-between mt-2">
                        {product.discount && product.discount > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] line-through" style={{ color: colors.muted }}>
                              {formatPrice(product.price)}
                            </span>
                            <span className="text-base font-bold" style={{ color: "#ef4444" }}>
                              {formatPrice(product.price * (1 - product.discount / 100))}
                            </span>
                          </div>
                        ) : (
                          <p className="text-base font-bold" style={{ color: colors.gold }}>
                            {formatPrice(product.price)}
                          </p>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddToCart(product.id)}
                          className="flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--gradient-accent)",
                            color: "var(--color-text-inverse)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Plus size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Appointments Content ─────────────────────── */}
        {activeTab === "appointments" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-base font-semibold font-[family-name:var(--font-display)]"
                style={{ color: colors.primary }}
              >
                {t("dashboard", "upcoming")}
              </h2>
              <Link
                href="/dashboard/appointments"
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: colors.gold }}
              >
                {t("common", "viewAll")}
                <ArrowRight size={13} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="py-10 text-center" style={glassCard}>
                <p className="text-sm" style={{ color: colors.muted }}>
                  {t("dashboard", "noAppointments")}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {upcoming.slice(0, 5).map((appt, i) => {
                  const stylist = allStylists.find((s) => s.id === appt.stylistId);
                  return (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.06,
                        duration: 0.45,
                        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                      }}
                    >
                      <div
                        className="flex items-center gap-4 p-4"
                        style={glassCard}
                      >
                        {stylist?.avatar && (
                          <div
                            className="flex-shrink-0 overflow-hidden"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              border: "1px solid var(--color-border-accent)",
                            }}
                          >
                            <Image
                              src={stylist.avatar}
                              alt={stylist.name}
                              width={44}
                              height={44}
                              className="object-cover"
                              style={{ width: 44, height: 44 }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: colors.primary }}>
                            {getServiceNames(appt)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                            {formatShortDate(appt.date, language)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: colors.gold, letterSpacing: "0.02em" }}
                          >
                            {formatTime(appt.startTime)}
                          </span>
                          <Badge variant={statusVariant(appt.status)}>
                            {statusLabel(appt.status)}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </motion.section>

      {/* ─── Floating Cart Bar ─────────────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4"
          >
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setCartOpen(true)}
                className="w-full rounded-xl px-6 py-4 flex items-center justify-between"
                style={{
                  background: "var(--color-bg-overlay)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid var(--color-border-accent)",
                  boxShadow: "var(--shadow-float)",
                  cursor: "pointer",
                  color: "var(--color-text-primary)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart size={20} style={{ color: colors.gold }} />
                    <span
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                      style={{ background: "var(--gradient-accent)", color: "var(--color-text-inverse)" }}
                    >
                      {totalItems}
                    </span>
                  </div>
                  <span className="font-medium text-sm">
                    {t("dashboard", "cart")}
                  </span>
                </div>
                <span className="font-bold text-lg" style={{ color: colors.gold }}>
                  {formatPrice(cartTotal)}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cart Modal ───────────────────────────────────── */}
      <Modal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        title={t("dashboard", "cart")}
        size="lg"
      >
        {items.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart size={40} className="mx-auto mb-3" style={{ color: colors.muted }} />
            <p style={{ color: colors.muted }}>{t("dashboard", "emptyCart")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const product = allProducts.find((p) => p.id === item.productId);
              if (!product) return null;
              return (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--color-border-default)" }}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--color-bg-glass)" }}>
                    <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: colors.primary }}>{product.name}</p>
                    <p className="text-sm font-semibold" style={{ color: colors.gold }}>{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ border: "1px solid var(--color-border-default)", background: "none", cursor: "pointer", color: colors.primary }}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium" style={{ color: colors.primary }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ border: "1px solid var(--color-border-default)", background: "none", cursor: "pointer", color: colors.primary }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-2 transition-colors"
                    style={{ color: colors.muted, cursor: "pointer", background: "none", border: "none" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            <div className="pt-4" style={{ borderTop: "1px solid var(--color-border-default)" }}>
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold" style={{ color: colors.primary }}>Total</span>
                <span className="text-xl font-bold" style={{ color: colors.gold }}>{formatPrice(cartTotal)}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: "var(--gradient-accent)",
                  color: "var(--color-text-inverse)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                {t("dashboard", "checkout")}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Payment Modal ────────────────────────────────── */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => { setShowPayment(false); setCheckoutInvoice(null); }}
        invoice={checkoutInvoice}
        onPaymentComplete={handlePaymentComplete}
      />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════════ */

/* ── Hero Reservation Card ──────────────────────────────────────── */
function ReservationHeroCard({
  appointment,
  language,
  getServiceNames,
  statusVariant,
  statusLabel,
}: {
  appointment: Booking;
  language: "en" | "es";
  getServiceNames: (appt: Booking) => string;
  statusVariant: (status: string) => "success" | "warning" | "error" | "info" | "default";
  statusLabel: (status: string) => string;
}) {
  const { allStylists } = useStaff();
  const stylist = allStylists.find((s) => s.id === appointment.stylistId);

  return (
    <div
      className="relative overflow-hidden p-5 sm:p-6"
      style={{
        ...glassCard,
        borderLeft: "3px solid var(--color-accent)",
        background: "var(--color-bg-glass-selected)",
      }}
    >
      {/* Subtle gold glow */}
      <div
        className="absolute -top-20 -right-20 pointer-events-none"
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--color-accent-subtle) 0%, transparent 70%)",
        }}
      />

      {/* Section label */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} style={{ color: colors.gold }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.gold }}
        >
          {language === "es" ? "Reserva Actual" : "Current Reservation"}
        </span>
      </div>

      {/* Content row */}
      <div className="flex items-center gap-4">
        {/* Specialist Photo */}
        {stylist?.avatar && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "2px solid var(--color-border-accent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <Image
              src={stylist.avatar}
              alt={stylist.name}
              width={56}
              height={56}
              className="object-cover"
              style={{ width: 56, height: 56 }}
            />
          </div>
        )}

        {/* Service + Date */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm sm:text-base font-semibold truncate"
            style={{ color: colors.primary }}
          >
            {getServiceNames(appointment)}
          </p>
          <p className="text-xs mt-1" style={{ color: colors.muted }}>
            {formatShortDate(appointment.date, language)}
          </p>
        </div>

        {/* Time + Status */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: colors.gold, letterSpacing: "0.02em" }}
          >
            {formatTime(appointment.startTime)}
          </span>
          <Badge variant={statusVariant(appointment.status)}>
            {statusLabel(appointment.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/* ── Empty Reservation Card ─────────────────────────────────────── */
function EmptyReservationCard({ language }: { language: "en" | "es" }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 px-6 text-center"
      style={glassCard}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--color-accent-subtle)",
          border: "1px solid var(--color-border-accent)",
        }}
      >
        <CalendarPlus size={24} style={{ color: colors.gold }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: colors.primary }}>
        {language === "es" ? "No tienes reservas" : "No reservations"}
      </p>
      <p className="text-xs mb-5" style={{ color: colors.muted }}>
        {language === "es"
          ? "Agenda tu pr\u00f3xima experiencia"
          : "Schedule your next experience"}
      </p>
      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-2.5 text-sm font-semibold"
          style={{
            background: "var(--gradient-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
          }}
        >
          {language === "es" ? "Reservar Ahora" : "Book Now"}
        </motion.button>
      </Link>
    </div>
  );
}
