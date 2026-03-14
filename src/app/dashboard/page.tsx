"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { getStoredData, setStoredData, formatPrice, generateId } from "@/lib/utils";
import { setDocument, onCollectionChange } from "@/lib/firestore";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { reviews as mockReviews } from "@/data/reviews";
import { useStaff } from "@/providers/StaffProvider";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/providers/ToastProvider";
import { useProducts } from "@/providers/ProductProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { usePayment, detectCardBrand } from "@/providers/PaymentProvider";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking, BookingStatus, Invoice, Review } from "@/types";
import type { CardFormData } from "@/components/payment/CreditCardForm";
import type { Variants } from "motion/react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import StarRating from "@/components/ui/StarRating";
import CreditCardForm from "@/components/payment/CreditCardForm";
import PaymentModal from "@/components/payment/PaymentModal";
import {
  CalendarDays,
  CalendarPlus,
  ShoppingBag,
  Star,
  UserCircle,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Shield,
  MessageSquare,
} from "lucide-react";

/* ── Shared glass style ─────────────────────────────────────────── */
const glassCard: React.CSSProperties = {
  background: "var(--color-bg-glass)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--color-border-default)",
  borderRadius: 24,
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

type ActiveTab = "shop" | "appointments" | "reviews" | "profile";

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unknown: "CARD",
};

/* ── Component ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();
  const { items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice: cartTotal } = useCart();
  const { addToast } = useToast();
  const { allProducts } = useProducts();
  const { invoices, addInvoice } = useInvoices();
  const { savedCards, addCard, removeCard, setDefaultCard } = usePayment();
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("shop");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [prevInvoicesLen, setPrevInvoicesLen] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [showCardForm, setShowCardForm] = useState(false);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
      setStoredData("mila-bookings", stored);
      for (const b of stored) {
        const { id, ...data } = b;
        setDocument("bookings", id, data).catch(() => {});
      }
    }
    setAppointments(stored);

    const unsub = onCollectionChange<Booking>("bookings", (firestoreBookings) => {
      if (firestoreBookings.length > 0) {
        setAppointments((prev) => {
          const merged = new Map<string, Booking>();
          for (const b of prev) merged.set(b.id, b);
          for (const b of firestoreBookings) merged.set(b.id, b);
          const next = Array.from(merged.values());
          setStoredData("mila-bookings", next);
          return next;
        });
      }
    });

    const storedReviews = getStoredData<Review[]>("mila-reviews", []);
    if (storedReviews.length === 0) {
      setStoredData("mila-reviews", mockReviews);
      setReviews(mockReviews);
    } else {
      setReviews(storedReviews);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
      setProfileEmail(user.email ?? "");
    }
  }, [user]);

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

  /* ── Appointments helpers ─────────────────────────────────────── */
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

  const allSorted = [...appointments].sort((a, b) => {
    const aDate = new Date(`${a.date}T${a.startTime}`);
    const bDate = new Date(`${b.date}T${b.startTime}`);
    const aFuture = aDate > now && a.status !== "cancelled";
    const bFuture = bDate > now && b.status !== "cancelled";
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return aDate.getTime() - bDate.getTime();
  });

  const nextAppointment = upcoming[0] ?? null;

  const statusVariant = (status: string) => {
    switch (status) {
      case "confirmed": return "success" as const;
      case "pending": return "warning" as const;
      case "cancelled": return "error" as const;
      case "completed": return "info" as const;
      default: return "default" as const;
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
    if (svcIds.length === 0) return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map((id) => services.find((s) => s.id === id)?.name[language] ?? id).join(", ");
  };

  function handleCancel(bookingId: string) {
    if (!confirm(t("dashboard", "cancelConfirm"))) return;
    const updated = appointments.map((a) =>
      a.id === bookingId ? { ...a, status: "cancelled" as BookingStatus } : a
    );
    setAppointments(updated);
    setStoredData("mila-bookings", updated);
    setDocument("bookings", bookingId, { status: "cancelled" }).catch(() => {});
    addToast(language === "es" ? "Cita cancelada" : "Appointment cancelled", "info");
  }

  function canCancel(appt: Booking): boolean {
    const apptDate = new Date(`${appt.date}T${appt.startTime}`);
    return apptDate > now && (appt.status === "pending" || appt.status === "confirmed");
  }

  /* ── Reviews helpers ──────────────────────────────────────────── */
  const completedAppointments = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    return !reviews.some((r) => r.bookingId === a.id);
  });

  const userReviews = reviews.filter((r) => r.clientId === user?.id);

  const getServiceNamesFromIds = (svcIds: string[] | undefined) => {
    if (!svcIds || svcIds.length === 0) return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map(id => services.find(s => s.id === id)?.name[language] ?? id).join(", ");
  };

  const completedOptions = completedAppointments.map((a) => {
    const serviceLabel = getServiceNamesFromIds(a.serviceIds);
    const stylist = allStylists.find((s) => s.id === a.stylistId);
    return {
      value: a.id,
      label: `${serviceLabel} - ${stylist?.name ?? a.stylistId} (${formatShortDate(a.date, language)})`,
    };
  });

  function handleSubmitReview() {
    if (!selectedBookingId || reviewRating === 0 || !reviewComment.trim()) {
      addToast(language === "es" ? "Completa todos los campos" : "Please fill all fields", "error");
      return;
    }
    const booking = appointments.find((a) => a.id === selectedBookingId);
    if (!booking || !user) return;
    const newReview: Review = {
      id: generateId(),
      bookingId: selectedBookingId,
      clientId: user.id,
      clientName: user.name,
      stylistId: booking.stylistId,
      serviceId: booking.serviceIds?.[0] ?? "",
      rating: reviewRating,
      comment: reviewComment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedReviews = [...reviews, newReview];
    setReviews(updatedReviews);
    setStoredData("mila-reviews", updatedReviews);
    setSelectedBookingId("");
    setReviewRating(0);
    setReviewComment("");
    addToast(language === "es" ? "Reseña enviada con éxito" : "Review submitted successfully", "success");
  }

  /* ── Profile helpers ──────────────────────────────────────────── */
  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    updateProfile({
      name: profileName.trim(),
      phone: profilePhone.trim(),
      email: profileEmail.trim() || undefined,
    });
    addToast(language === "es" ? "Perfil actualizado" : "Profile updated successfully", "success");
  }

  function handleAddCardSubmit(data: CardFormData) {
    if (!user) return;
    addCard({
      userId: user.id,
      cardholderName: data.cardholderName,
      lastFourDigits: data.cardNumber.slice(-4),
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      cardBrand: detectCardBrand(data.cardNumber),
      isDefault: savedCards.length === 0,
    });
    setShowCardForm(false);
    addToast(language === "es" ? "Tarjeta agregada exitosamente" : "Card added successfully", "success");
  }

  function handleRemoveCard(cardId: string) {
    removeCard(cardId);
    addToast(language === "es" ? "Tarjeta eliminada" : "Card removed", "success");
  }

  function handleSetDefault(cardId: string) {
    setDefaultCard(cardId);
    addToast(language === "es" ? "Tarjeta predeterminada actualizada" : "Default card updated", "success");
  }

  /* ── Navigation cards config ────────────────────────────────── */
  const navCards: { icon: typeof CalendarDays; label: string; accent: boolean; tab?: ActiveTab; href?: string }[] = [
    { icon: ShoppingBag, label: language === "es" ? "Tienda" : "Shop", accent: false, tab: "shop" },
    { icon: CalendarDays, label: language === "es" ? "Mis Citas" : "My Appointments", accent: false, tab: "appointments" },
    { icon: CalendarPlus, label: language === "es" ? "Reservar" : "Book New", accent: true, href: "/" },
    { icon: Star, label: language === "es" ? "Reseñas" : "Reviews", accent: false, tab: "reviews" },
    { icon: UserCircle, label: language === "es" ? "Mi Perfil" : "My Profile", accent: false, tab: "profile" },
  ];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-24">
      {/* ─── Welcome ──────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="pt-1">
        <div
          style={{
            width: 32,
            height: 1,
            background: "var(--gradient-accent-h)",
            marginBottom: 12,
          }}
        />
        <h1
          style={{
            fontFamily: "var(--font-accent)",
            fontSize: "clamp(36px, 8vw, 52px)",
            fontWeight: 400,
            fontStyle: "italic",
            color: colors.primary,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            textTransform: "none",
          }}
        >
          {user?.name}
        </h1>
        <p className="mt-2 text-sm" style={{ color: colors.secondary }}>
          {language === "es" ? "Qué bueno que estás aquí" : "So glad you're here"}
        </p>
      </motion.div>

      {/* ─── Hero Reservation Card ────────────────────────── */}
      <motion.section variants={itemVariants}>
        {nextAppointment ? (
          <ReservationHeroCard appointment={nextAppointment} language={language} getServiceNames={getServiceNames} statusVariant={statusVariant} statusLabel={statusLabel} />
        ) : (
          <EmptyReservationCard language={language} />
        )}
      </motion.section>

      {/* ─── Navigation Grid ──────────────────────────────── */}
      {/* ─── Compact Navigation Row ────────────────────────── */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between gap-2 px-2">
          {navCards.map((card, i) => {
            const Icon = card.icon;
            const isActive = card.tab ? activeTab === card.tab : false;
            const isAccent = !!card.href;

            const iconStyle: React.CSSProperties = {
              width: 46,
              height: 46,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isAccent
                ? "var(--gradient-accent)"
                : isActive
                  ? "var(--color-accent-subtle)"
                  : "var(--color-bg-glass)",
              border: isActive
                ? "1.5px solid var(--color-accent)"
                : isAccent
                  ? "none"
                  : "1px solid var(--color-border-subtle)",
              boxShadow: isActive ? "var(--shadow-glow)" : "none",
              transition: "all 0.3s ease",
            };

            const labelColor = isAccent
              ? colors.gold
              : isActive
                ? colors.gold
                : colors.muted;

            if (card.href) {
              return (
                <Link key={card.href} href={card.href} className="flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    style={iconStyle}
                  >
                    <Icon size={20} style={{ color: isAccent ? "#fff" : colors.gold }} />
                  </motion.div>
                  <span style={{ fontSize: 9, color: labelColor, fontFamily: "var(--font-display)", letterSpacing: "0.06em", lineHeight: 1 }}>{card.label.split(" ")[0]}</span>
                </Link>
              );
            }

            return (
              <button
                key={card.tab}
                onClick={() => card.tab && setActiveTab(card.tab)}
                className="flex flex-col items-center gap-1"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  style={iconStyle}
                >
                  <Icon size={20} style={{ color: isActive ? colors.gold : colors.secondary }} />
                </motion.div>
                <span style={{ fontSize: 9, color: labelColor, fontFamily: "var(--font-display)", letterSpacing: "0.06em", lineHeight: 1 }}>{card.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ─── Tab Content ──────────────────────────────────── */}
      <motion.section variants={itemVariants}>
        <AnimatePresence mode="wait">
          {/* ── Shop ─────────────────────────── */}
          {activeTab === "shop" && (
            <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-4">
              <div className="flex overflow-x-auto gap-2 pb-1">
                {SHOP_CATEGORIES.map((cat) => (
                  <button key={cat.value} onClick={() => setActiveCategory(cat.value)} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200" style={{ background: activeCategory === cat.value ? "var(--gradient-accent)" : "var(--color-bg-glass)", color: activeCategory === cat.value ? "var(--color-text-inverse)" : "var(--color-text-secondary)", border: activeCategory === cat.value ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)", cursor: "pointer" }}>
                    {language === "es" ? cat.labelEs : cat.labelEn}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <motion.div key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="overflow-hidden h-full flex flex-col" style={glassCard}>
                      <div className="relative aspect-square" style={{ background: "var(--color-bg-glass)" }}>
                        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                        {product.discount && product.discount > 0 && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#ef4444", color: "#fff" }}>-{product.discount}%</div>
                        )}
                        {product.featured && (
                          <div className="absolute top-2 right-2 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-accent)" }}>
                            <Sparkles size={10} style={{ color: colors.gold }} />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <p style={{ fontSize: 10, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.14em", color: colors.muted }}>{product.brand}</p>
                        <p className="font-semibold mt-1 line-clamp-2 flex-1" style={{ fontSize: 13, color: colors.primary }}>{product.name}</p>
                        <StarRating rating={product.rating} size={10} className="mt-1.5" />
                        <div className="flex items-center justify-between mt-2">
                          {product.discount && product.discount > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] line-through" style={{ color: colors.muted }}>{formatPrice(product.price)}</span>
                              <span className="text-base font-bold" style={{ color: "#ef4444" }}>{formatPrice(product.price * (1 - product.discount / 100))}</span>
                            </div>
                          ) : (
                            <p className="text-base font-bold" style={{ color: colors.gold }}>{formatPrice(product.price)}</p>
                          )}
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleAddToCart(product.id)} className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-accent)", color: "var(--color-text-inverse)", border: "none", cursor: "pointer" }}>
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

          {/* ── Appointments ─────────────────── */}
          {activeTab === "appointments" && (
            <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-3">
              {allSorted.length === 0 ? (
                <Card><p className="text-center py-8" style={{ color: colors.muted }}>{t("dashboard", "noAppointments")}</p></Card>
              ) : (
                allSorted.map((appt, i) => {
                  const stylist = allStylists.find((s) => s.id === appt.stylistId);
                  const isFuture = new Date(`${appt.date}T${appt.startTime}`) > now;
                  return (
                    <motion.div key={appt.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
                      <Card className={!isFuture ? "opacity-70" : ""}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="truncate" style={{ fontFamily: "var(--font-accent)", fontSize: 16, fontWeight: 400, fontStyle: "italic", color: colors.primary }}>{getServiceNames(appt)}</p>
                              <Badge variant={statusVariant(appt.status)}>{statusLabel(appt.status)}</Badge>
                            </div>
                            <p className="text-sm" style={{ color: colors.secondary }}>{stylist?.name ?? appt.stylistId} &middot; {stylist?.role[language]}</p>
                            <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontSize: 11, color: colors.muted, letterSpacing: "0.06em" }}>{formatShortDate(appt.date, language)} &middot; {formatTime(appt.startTime)} - {formatTime(appt.endTime)}</p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <p className="text-lg font-semibold" style={{ color: colors.gold }}>{formatPrice(appt.totalPrice)}</p>
                            {canCancel(appt) && <Button variant="danger" size="sm" onClick={() => handleCancel(appt.id)}>{t("dashboard", "cancel")}</Button>}
                          </div>
                        </div>
                        {appt.notes && <p className="text-xs mt-3 pt-3" style={{ color: colors.muted, borderTop: "1px solid var(--color-border-default)" }}>{appt.notes}</p>}
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ── Reviews ──────────────────────── */}
          {activeTab === "reviews" && (
            <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-6">
              <Card>
                <h2 style={{ fontFamily: "var(--font-accent)", fontSize: 24, fontWeight: 300, fontStyle: "italic", color: colors.primary, marginBottom: 16, textTransform: "none", letterSpacing: "normal" }}>{t("dashboard", "leaveReview")}</h2>
                {completedOptions.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: colors.muted }}>{language === "es" ? "No tienes citas completadas para reseña" : "No completed appointments to review"}</p>
                ) : (
                  <div className="space-y-4">
                    <Select label={language === "es" ? "Seleccionar cita" : "Select appointment"} options={completedOptions} value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)} placeholder={language === "es" ? "Elige una cita..." : "Choose an appointment..."} />
                    <div>
                      <p className="text-sm font-medium mb-1.5" style={{ color: colors.secondary }}>{language === "es" ? "Tu puntuación" : "Your rating"}</p>
                      <StarRating rating={reviewRating} size={28} interactive onChange={setReviewRating} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: colors.secondary }}>{t("dashboard", "yourReview")}</label>
                      <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} placeholder={language === "es" ? "Comparte tu experiencia..." : "Share your experience..."} className="w-full px-4 py-3 rounded-lg text-sm resize-none transition-all duration-200" style={{ background: "var(--color-bg-input)", color: colors.primary, border: "1px solid var(--color-border-default)", outline: "none" }} onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)"; }} onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; e.currentTarget.style.boxShadow = "none"; }} />
                    </div>
                    <Button onClick={handleSubmitReview}>{t("dashboard", "submitReview")}</Button>
                  </div>
                )}
              </Card>

              <div>
                <h2 className="flex items-center gap-2" style={{ fontFamily: "var(--font-accent)", fontSize: 22, fontWeight: 300, fontStyle: "italic", color: colors.primary, marginBottom: 16, textTransform: "none", letterSpacing: "normal" }}>
                  <MessageSquare size={18} style={{ color: colors.gold }} />
                  {language === "es" ? "Tus Reseñas" : "Your Reviews"}
                </h2>
                {userReviews.length === 0 ? (
                  <Card><p className="text-center py-6" style={{ color: colors.muted }}>{language === "es" ? "Aún no has dejado reseñas" : "You haven't left any reviews yet"}</p></Card>
                ) : (
                  <div className="space-y-4">
                    {userReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((review, i) => {
                      const service = services.find((s) => s.id === review.serviceId);
                      const stylist = allStylists.find((s) => s.id === review.stylistId);
                      return (
                        <motion.div key={review.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i, duration: 0.4 }}>
                          <Card>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p style={{ fontFamily: "var(--font-accent)", fontSize: 16, fontWeight: 400, fontStyle: "italic", color: colors.primary }}>{service?.name[language] ?? review.serviceId}</p>
                                <p className="text-sm" style={{ color: colors.secondary }}>{stylist?.name ?? review.stylistId}</p>
                              </div>
                              <p className="text-xs flex-shrink-0" style={{ color: colors.muted }}>{formatShortDate(review.createdAt.split("T")[0], language)}</p>
                            </div>
                            <StarRating rating={review.rating} size={16} className="mb-2" />
                            <p className="text-sm leading-relaxed" style={{ color: colors.secondary }}>{review.comment}</p>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Profile ──────────────────────── */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-6">
              <Card>
                <div className="flex justify-center mb-6">
                  <div style={{ padding: 3, borderRadius: "50%", background: "var(--gradient-ring)" }}>
                    <Avatar src={user?.avatar} alt={user?.name ?? "User"} size="xl" />
                  </div>
                </div>
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <Input label={t("auth", "name")} type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Sofia Chen" />
                  <Input label={t("auth", "phone")} type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="555 300 4000" />
                  <Input label={language === "es" ? "Email (opcional)" : "Email (optional)"} type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="you@example.com" />
                  <div className="pt-2"><Button type="submit" fullWidth>{t("dashboard", "updateProfile")}</Button></div>
                </form>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} style={{ color: colors.gold }} />
                    <h2 style={{ fontFamily: "var(--font-accent)", fontSize: 22, fontWeight: 300, fontStyle: "italic", color: colors.primary, textTransform: "none", letterSpacing: "normal" }}>{t("dashboard", "paymentMethods")}</h2>
                  </div>
                  {!showCardForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowCardForm(true)}>
                      <Plus size={14} /><span className="text-xs">{t("dashboard", "addNewCard")}</span>
                    </Button>
                  )}
                </div>

                {savedCards.length > 0 ? (
                  <div className="space-y-3 mb-5">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>{t("dashboard", "savedCards")}</p>
                    {savedCards.map((card) => (
                      <motion.div key={card.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--color-bg-glass)", border: card.isDefault ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)", backdropFilter: "blur(8px)" }}>
                        <div className="flex items-center justify-center rounded-lg" style={{ width: 44, height: 32, background: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
                          <span className="text-[10px] font-bold tracking-wider" style={{ color: card.cardBrand === "visa" ? "#1A1F71" : card.cardBrand === "mastercard" ? "#EB001B" : card.cardBrand === "amex" ? "#006FCF" : "var(--color-accent)" }}>{BRAND_DISPLAY[card.cardBrand] ?? "CARD"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium" style={{ color: colors.primary }}>{BRAND_DISPLAY[card.cardBrand] ?? "CARD"} <span className="font-mono" style={{ color: colors.secondary }}>**** {card.lastFourDigits}</span></p>
                            {card.isDefault && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider" style={{ background: "var(--color-accent-subtle)", color: colors.gold }}><Star size={8} />{t("dashboard", "defaultCard")}</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>{card.expiryMonth}/{card.expiryYear} · {card.cardholderName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!card.isDefault && (
                            <button onClick={() => handleSetDefault(card.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ color: colors.gold, border: "1px solid var(--color-border-default)", background: "transparent", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.background = "var(--color-accent-subtle)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; e.currentTarget.style.background = "transparent"; }}>
                              <Shield size={12} className="inline mr-1" />{language === "es" ? "Predeterminar" : "Set default"}
                            </button>
                          )}
                          <button onClick={() => handleRemoveCard(card.id)} className="p-2 rounded-lg transition-colors" style={{ color: colors.muted, background: "transparent", border: "none", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#9B4D4D"; e.currentTarget.style.background = "rgba(155, 77, 77, 0.08)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.background = "transparent"; }} title={t("dashboard", "removeCard")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : !showCardForm ? (
                  <div className="text-center py-8">
                    <CreditCard size={36} className="mx-auto mb-3" style={{ color: colors.muted }} />
                    <p className="text-sm mb-4" style={{ color: colors.muted }}>{t("dashboard", "noSavedCards")}</p>
                    <Button size="sm" variant="outline" onClick={() => setShowCardForm(true)}><Plus size={14} />{t("dashboard", "addNewCard")}</Button>
                  </div>
                ) : null}

                <AnimatePresence>
                  {showCardForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                      <div className="pt-4" style={{ borderTop: savedCards.length > 0 ? "1px solid var(--color-border-default)" : "none" }}>
                        <p className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: colors.muted }}>{t("dashboard", "addNewCard")}</p>
                        <CreditCardForm onSubmit={handleAddCardSubmit} onCancel={() => setShowCardForm(false)} showSaveOption={false} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ─── Floating Cart Bar ─────────────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-40 p-4">
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setCartOpen(true)} className="w-full rounded-xl px-6 py-4 flex items-center justify-between" style={{ background: "var(--color-bg-overlay)", backdropFilter: "blur(20px)", border: "1px solid var(--color-border-accent)", boxShadow: "var(--shadow-float)", cursor: "pointer", color: colors.primary }}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart size={20} style={{ color: colors.gold }} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: "var(--gradient-accent)", color: "var(--color-text-inverse)" }}>{totalItems}</span>
                  </div>
                  <span className="font-medium text-sm">{t("dashboard", "cart")}</span>
                </div>
                <span className="font-bold text-lg" style={{ color: colors.gold }}>{formatPrice(cartTotal)}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cart Modal ───────────────────────────────────── */}
      <Modal isOpen={cartOpen} onClose={() => setCartOpen(false)} title={t("dashboard", "cart")} size="lg">
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
                <div key={item.productId} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "var(--color-border-default)" }}>
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--color-bg-glass)" }}>
                    <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: colors.primary }}>{product.name}</p>
                    <p className="text-sm font-semibold" style={{ color: colors.gold }}>{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: "1px solid var(--color-border-default)", background: "none", cursor: "pointer", color: colors.primary }}><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-medium" style={{ color: colors.primary }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: "1px solid var(--color-border-default)", background: "none", cursor: "pointer", color: colors.primary }}><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="p-2 transition-colors" style={{ color: colors.muted, cursor: "pointer", background: "none", border: "none" }}><Trash2 size={16} /></button>
                </div>
              );
            })}
            <div className="pt-4" style={{ borderTop: "1px solid var(--color-border-default)" }}>
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold" style={{ color: colors.primary }}>Total</span>
                <span className="text-xl font-bold" style={{ color: colors.gold }}>{formatPrice(cartTotal)}</span>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCheckout} className="w-full py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--gradient-accent)", color: "var(--color-text-inverse)", border: "none", cursor: "pointer", boxShadow: "var(--shadow-glow)" }}>
                {t("dashboard", "checkout")}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Payment Modal ────────────────────────────────── */}
      <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); setCheckoutInvoice(null); }} invoice={checkoutInvoice} onPaymentComplete={handlePaymentComplete} />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════════ */

function ReservationHeroCard({ appointment, language, getServiceNames, statusVariant, statusLabel }: {
  appointment: Booking; language: "en" | "es"; getServiceNames: (appt: Booking) => string;
  statusVariant: (status: string) => "success" | "warning" | "error" | "info" | "default";
  statusLabel: (status: string) => string;
}) {
  const { allStylists } = useStaff();
  const stylist = allStylists.find((s) => s.id === appointment.stylistId);

  return (
    <div className="relative overflow-hidden px-4 py-3" style={{ ...glassCard, borderRadius: 16, borderLeft: "2px solid var(--color-accent)", background: "var(--color-bg-glass-selected)" }}>
      <div className="absolute -top-16 -right-16 pointer-events-none" style={{ width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, var(--color-accent-subtle) 0%, transparent 70%)" }} />
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={11} style={{ color: colors.gold }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.gold }}>{language === "es" ? "Reserva Actual" : "Current Reservation"}</span>
      </div>
      <div className="flex items-center gap-3">
        {stylist?.avatar && (
          <div className="flex-shrink-0 overflow-hidden" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--color-border-accent)", boxShadow: "var(--shadow-card)" }}>
            <Image src={stylist.avatar} alt={stylist.name} width={40} height={40} className="object-cover" style={{ width: 40, height: 40 }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ fontFamily: "var(--font-accent)", fontSize: "clamp(13px, 2.8vw, 16px)", fontWeight: 400, fontStyle: "italic", color: colors.primary }}>{getServiceNames(appointment)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: colors.muted }}>{formatShortDate(appointment.date, language)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span style={{ fontFamily: "var(--font-accent)", fontSize: 18, fontWeight: 400, color: colors.gold, letterSpacing: "0.02em" }}>{formatTime(appointment.startTime)}</span>
          <Badge variant={statusVariant(appointment.status)}>{statusLabel(appointment.status)}</Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyReservationCard({ language }: { language: "en" | "es" }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center" style={{ ...glassCard, borderRadius: 16 }}>
      <div className="flex items-center justify-center mb-3" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-accent)" }}>
        <CalendarPlus size={18} style={{ color: colors.gold }} />
      </div>
      <p className="text-xs font-medium mb-0.5" style={{ color: colors.primary }}>{language === "es" ? "No tienes reservas" : "No reservations"}</p>
      <p className="text-[10px] mb-4" style={{ color: colors.muted }}>{language === "es" ? "Agenda tu próxima experiencia" : "Schedule your next experience"}</p>
      <Link href="/">
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-5 py-2 text-xs font-semibold" style={{ background: "var(--gradient-accent)", color: "var(--color-text-inverse)", borderRadius: 10, border: "none", cursor: "pointer" }}>
          {language === "es" ? "Reservar Ahora" : "Book Now"}
        </motion.button>
      </Link>
    </div>
  );
}
