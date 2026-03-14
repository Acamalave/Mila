"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { Globe, User, LogOut, ChevronDown, X, Target, Eye, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import InvoiceDetailModal from "@/components/payment/InvoiceDetailModal";
import PaymentModal from "@/components/payment/PaymentModal";
import type { Invoice } from "@/types";

export default function Header() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { invoices } = useInvoices();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Payment flow states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerOpacity = Math.min(0.95, 0.6 + scrollY / 500);
  const headerBlur = Math.min(20, 8 + scrollY / 50);
  const borderOpacity = 0.03 + scrollY / 3000;

  const headerBg = `rgba(10, 10, 10, ${headerOpacity})`;
  const headerBorder = `1px solid rgba(255, 255, 255, ${borderOpacity})`;

  const headerStyle: React.CSSProperties = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: headerBg,
    backdropFilter: `blur(${headerBlur}px)`,
    WebkitBackdropFilter: `blur(${headerBlur}px)`,
    borderBottom: headerBorder,
    transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
  };

  const handlePayInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setNotifOpen(false);
      setShowInvoiceDetail(true);
    }
  };

  const handlePayFromDetail = () => {
    setShowInvoiceDetail(false);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  };

  return (
    <>
      <header style={headerStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo - click to show brand story */}
            <button
              onClick={() => setShowBrandModal(true)}
              className="flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
            >
              <Image
                src="/logo-mila.png"
                alt="Mila Concept"
                width={160}
                height={64}
                className="h-10 sm:h-14 w-auto object-contain"
                priority
              />
            </button>

            {/* Right side actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Language Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLanguage(language === "en" ? "es" : "en")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "var(--color-bg-glass-hover)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-secondary)",
                  fontSize: "13px",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  transition: "all 0.3s ease",
                }}
              >
                <Globe size={14} />
                <span className="uppercase">{language}</span>
              </motion.button>

              {/* Notification Bell - only when authenticated */}
              {isAuthenticated && (
                <div className="relative">
                  <NotificationBell
                    isOpen={notifOpen}
                    onToggle={() => {
                      setNotifOpen(!notifOpen);
                      setProfileOpen(false);
                    }}
                    unreadCount={unreadCount}
                  />
                  <NotificationPanel
                    isOpen={notifOpen}
                    onClose={() => setNotifOpen(false)}
                    onPayInvoice={handlePayInvoice}
                  />
                </div>
              )}

              {isAuthenticated && user ? (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-border-accent)",
                      color: "var(--color-accent)",
                      fontSize: "13px",
                      fontWeight: 500,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <User size={14} />
                    <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                    <ChevronDown size={12} style={{
                      transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }} />
                  </motion.button>
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden"
                        style={{
                          background: "var(--color-bg-glass-hover)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          boxShadow: "var(--shadow-float)",
                          border: "1px solid var(--color-border-default)",
                          transition: "background 0.3s ease, border-color 0.3s ease",
                        }}
                      >
                        <Link
                          href={user.role === "admin" ? "/admin" : "/dashboard"}
                          className="block px-4 py-3 text-sm transition-colors"
                          style={{ color: "var(--color-text-primary)", transition: "background 0.2s ease, color 0.3s ease" }}
                          onClick={() => setProfileOpen(false)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-glass-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {user.role === "admin" ? t("nav", "admin") : t("nav", "dashboard")}
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setProfileOpen(false);
                            router.push("/");
                          }}
                          className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors"
                          style={{ color: "#9B4D4D", transition: "background 0.2s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(155, 77, 77, 0.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <LogOut size={14} />
                          {t("nav", "logout")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/login">
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-block px-5 py-2 rounded-full text-sm font-medium"
                    style={{
                      background: "var(--gradient-accent)",
                      color: "var(--color-text-inverse)",
                      boxShadow: "var(--shadow-glow)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {t("nav", "login")}
                  </motion.span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={showInvoiceDetail}
        onClose={() => {
          setShowInvoiceDetail(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onPay={handlePayFromDetail}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Brand Story Modal */}
      <AnimatePresence>
        {showBrandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowBrandModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border-default)",
                boxShadow: "var(--shadow-float)",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowBrandModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full"
                style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>

              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <Image src="/logo-mila.png" alt="Milà Concept" width={140} height={56} className="mx-auto h-12 w-auto object-contain mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                    {language === "es" ? "¿Qué significa MILÀ?" : "What does MILÀ mean?"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {language === "es"
                      ? "MILÀ nace de la pasión por transformar y empoderar a cada persona que cruza nuestras puertas. Es sinónimo de elegancia, sofisticación y cuidado personal de alta gama en el corazón de Panamá."
                      : "MILÀ is born from the passion to transform and empower every person who walks through our doors. It is synonymous with elegance, sophistication, and high-end personal care in the heart of Panama."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Mission */}
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-default)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={18} style={{ color: "var(--color-accent)" }} />
                      <h3 className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                        {language === "es" ? "Misión" : "Mission"}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {language === "es"
                        ? "Brindar servicios de belleza de alta calidad, utilizando productos premium y técnicas innovadoras que realcen la belleza natural de cada cliente, en un ambiente de lujo y confianza."
                        : "To provide high-quality beauty services using premium products and innovative techniques that enhance the natural beauty of each client, in an atmosphere of luxury and trust."}
                    </p>
                  </div>

                  {/* Vision */}
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-default)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={18} style={{ color: "var(--color-accent)" }} />
                      <h3 className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                        {language === "es" ? "Visión" : "Vision"}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {language === "es"
                        ? "Ser el salón de belleza de referencia en Panamá, reconocido por la excelencia en el servicio, la innovación constante y la formación de profesionales líderes en la industria."
                        : "To be the leading beauty salon in Panama, recognized for service excellence, constant innovation, and the training of industry-leading professionals."}
                    </p>
                  </div>

                  {/* Objectives */}
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-default)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={18} style={{ color: "var(--color-accent)" }} />
                      <h3 className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>
                        {language === "es" ? "Objetivos" : "Objectives"}
                      </h3>
                    </div>
                    <ul className="text-xs leading-relaxed space-y-1.5" style={{ color: "var(--color-text-secondary)" }}>
                      <li>{language === "es" ? "• Ofrecer una experiencia personalizada y exclusiva a cada cliente." : "• Offer a personalized and exclusive experience to each client."}</li>
                      <li>{language === "es" ? "• Capacitar y formar talento en técnicas de vanguardia." : "• Train and develop talent in cutting-edge techniques."}</li>
                      <li>{language === "es" ? "• Expandir nuestros servicios VIP y formación profesional." : "• Expand our VIP services and professional training."}</li>
                      <li>{language === "es" ? "• Ser líderes en innovación, calidad y atención al cliente." : "• Be leaders in innovation, quality, and customer service."}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
