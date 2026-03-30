"use client";

import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { usePayment, detectCardBrand } from "@/providers/PaymentProvider";
import CreditCardForm, { type CardFormData } from "@/components/payment/CreditCardForm";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  UserCircle,
  CreditCard,
  Plus,
  Trash2,
  Star,
  Shield,
} from "lucide-react";

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unknown: "CARD",
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { savedCards, addCard, removeCard, setDefaultCard } = usePayment();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [showCardForm, setShowCardForm] = useState(false);

  // Sync form fields when user data becomes available (after hydration)
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setEmail(user.email ?? "");
    }
  }, [user]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!user) return;

    updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    });

    addToast(
      language === "es"
        ? "Perfil actualizado"
        : "Profile updated successfully",
      "success"
    );
  }

  function handleAddCard(data: CardFormData) {
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
    addToast(
      language === "es"
        ? "Tarjeta agregada exitosamente"
        : "Card added successfully",
      "success"
    );
  }

  function handleRemoveCard(cardId: string) {
    removeCard(cardId);
    addToast(
      language === "es"
        ? "Tarjeta eliminada"
        : "Card removed",
      "success"
    );
  }

  function handleSetDefault(cardId: string) {
    setDefaultCard(cardId);
    addToast(
      language === "es"
        ? "Tarjeta predeterminada actualizada"
        : "Default card updated",
      "success"
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <div style={{ width: 32, height: 1, background: "var(--gradient-accent-h)", marginBottom: 12 }} />
        <h1 style={{ fontFamily: "var(--font-accent)", fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 300, fontStyle: "italic", color: "var(--color-text-primary)", lineHeight: 1.1, textTransform: "none", letterSpacing: "normal" }}>
          {t("dashboard", "profile")}
        </h1>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div style={{ padding: 3, borderRadius: "50%", background: "var(--gradient-ring)" }}>
              <Avatar
                src={user?.avatar}
                alt={user?.name ?? "User"}
                size="xl"
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t("auth", "name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />

            <Input
              label={t("auth", "phone")}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="6000 0000"
            />

            <Input
              label={language === "es" ? "Email (opcional)" : "Email (optional)"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div className="pt-2">
              <Button type="submit" fullWidth>
                {t("dashboard", "updateProfile")}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Payment Methods Section */}
      <motion.div variants={fadeInUp}>
        <Card>
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <CreditCard size={20} style={{ color: "var(--color-accent)" }} />
              <h2 style={{ fontFamily: "var(--font-accent)", fontSize: 22, fontWeight: 300, fontStyle: "italic", color: "var(--color-text-primary)", textTransform: "none", letterSpacing: "normal" }}>
                {t("dashboard", "paymentMethods")}
              </h2>
            </div>
            {!showCardForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCardForm(true)}
              >
                <Plus size={14} />
                <span className="text-xs">
                  {t("dashboard", "addNewCard")}
                </span>
              </Button>
            )}
          </div>

          {/* Saved cards list */}
          {savedCards.length > 0 ? (
            <div className="space-y-3 mb-5">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("dashboard", "savedCards")}
              </p>
              {savedCards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: "var(--color-bg-glass)",
                    border: card.isDefault
                      ? "1px solid var(--color-accent)"
                      : "1px solid var(--color-border-default)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Card icon and brand */}
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 44,
                      height: 32,
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{
                        color:
                          card.cardBrand === "visa"
                            ? "#1A1F71"
                            : card.cardBrand === "mastercard"
                            ? "#EB001B"
                            : card.cardBrand === "amex"
                            ? "#006FCF"
                            : "var(--color-accent)",
                      }}
                    >
                      {BRAND_DISPLAY[card.cardBrand] ?? "CARD"}
                    </span>
                  </div>

                  {/* Card details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {BRAND_DISPLAY[card.cardBrand] ?? "CARD"}{" "}
                        <span
                          className="font-mono"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          **** {card.lastFourDigits}
                        </span>
                      </p>
                      {card.isDefault && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            background: "var(--color-accent-subtle)",
                            color: "var(--color-accent)",
                          }}
                        >
                          <Star size={8} />
                          {t("dashboard", "defaultCard")}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {card.expiryMonth}/{card.expiryYear}
                      {" \u00B7 "}
                      {card.cardholderName}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!card.isDefault && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          color: "var(--color-accent)",
                          border: "1px solid var(--color-border-default)",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-accent)";
                          e.currentTarget.style.background = "var(--color-accent-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border-default)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Shield size={12} className="inline mr-1" />
                        {language === "es" ? "Predeterminar" : "Set default"}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveCard(card.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        color: "var(--color-text-muted)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#9B4D4D";
                        e.currentTarget.style.background = "rgba(155, 77, 77, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title={t("dashboard", "removeCard")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : !showCardForm ? (
            <div className="text-center py-8">
              <CreditCard
                size={36}
                className="mx-auto mb-3"
                style={{ color: "var(--color-text-muted)" }}
              />
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("dashboard", "noSavedCards")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCardForm(true)}
              >
                <Plus size={14} />
                {t("dashboard", "addNewCard")}
              </Button>
            </div>
          ) : null}

          {/* Inline add card form */}
          <AnimatePresence>
            {showCardForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="pt-4"
                  style={{
                    borderTop: savedCards.length > 0
                      ? "1px solid var(--color-border-default)"
                      : "none",
                  }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-4"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("dashboard", "addNewCard")}
                  </p>
                  <CreditCardForm
                    onSubmit={handleAddCard}
                    onCancel={() => setShowCardForm(false)}
                    showSaveOption={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
  );
}
