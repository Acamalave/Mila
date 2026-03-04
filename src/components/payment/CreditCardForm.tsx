"use client";

import { useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { detectCardBrand } from "@/providers/PaymentProvider";
import type { CardBrand } from "@/types";

export interface CardFormData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  saveCard: boolean;
}

interface CreditCardFormProps {
  onSubmit: (data: CardFormData) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  showSaveOption?: boolean;
}

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unknown: "",
};

const BRAND_COLORS: Record<CardBrand, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  discover: "#FF6600",
  unknown: "var(--color-accent)",
};

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleaned;
}

function formatExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
  }
  return cleaned;
}

export default function CreditCardForm({
  onSubmit,
  onCancel,
  isProcessing = false,
  showSaveOption = false,
}: CreditCardFormProps) {
  const { t } = useLanguage();

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const rawCardNumber = cardNumber.replace(/\s/g, "");
  const brand = detectCardBrand(rawCardNumber);
  const maxCvvLength = brand === "amex" ? 4 : 3;

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!cardholderName.trim()) {
      errs.cardholderName = t("payment", "nameRequired");
    }
    const cleanNum = cardNumber.replace(/\s/g, "");
    const expectedLength = brand === "amex" ? 15 : 16;
    if (cleanNum.length < expectedLength) {
      errs.cardNumber = t("payment", "invalidCard");
    }
    const expiryParts = expiry.split("/");
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      errs.expiry = t("payment", "invalidExpiry");
    } else {
      const month = parseInt(expiryParts[0], 10);
      if (month < 1 || month > 12) {
        errs.expiry = t("payment", "invalidExpiry");
      }
    }
    if (cvv.length < maxCvvLength) {
      errs.cvv = t("payment", "invalidCvv");
    }
    return errs;
  }, [cardholderName, cardNumber, expiry, cvv, brand, maxCvvLength, t]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ cardholderName: true, cardNumber: true, expiry: true, cvv: true });
    if (Object.keys(validationErrors).length > 0) return;

    const expiryParts = expiry.split("/");
    onSubmit({
      cardholderName: cardholderName.trim(),
      cardNumber: rawCardNumber,
      expiryMonth: expiryParts[0],
      expiryYear: expiryParts[1],
      cvv,
      saveCard,
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validate();
    if (validationErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validationErrors[field] }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const maxLen = brand === "amex" ? 15 : 16;
    setCardNumber(formatCardNumber(cleaned.slice(0, maxLen)));
  };

  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/[^\d/]/g, "");
    // If the user is typing (not deleting)
    const rawDigits = cleaned.replace(/\D/g, "");
    if (rawDigits.length <= 4) {
      setExpiry(formatExpiry(rawDigits));
    }
  };

  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setCvv(cleaned.slice(0, maxCvvLength));
  };

  const inputStyle = (hasError: boolean, isFocusable?: boolean): React.CSSProperties => ({
    background: "var(--color-bg-input)",
    border: hasError ? "1px solid #9B4D4D" : "1px solid var(--color-border-default)",
    color: isProcessing ? "var(--color-text-muted)" : "var(--color-text-primary)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
    letterSpacing: "0.02em",
    borderRadius: 12,
    opacity: isProcessing ? 0.6 : 1,
  });

  // Card preview display values
  const displayNumber = rawCardNumber || "0000000000000000";
  const displayLast4 = displayNumber.slice(-4).padStart(4, "0");
  const displayFirst4 = displayNumber.slice(0, 4).padStart(4, "0");
  const displayName = cardholderName.trim() || "CARDHOLDER NAME";
  const displayExpiry = expiry || "MM/YY";

  return (
    <div className="space-y-5">
      {/* Card Preview */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-bg-glass) 0%, var(--color-bg-card) 50%, var(--color-bg-glass) 100%)",
          border: "1px solid var(--color-border-default)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--shadow-card)",
          minHeight: 180,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--color-accent)",
            opacity: 0.04,
            top: -60,
            right: -40,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "var(--color-accent)",
            opacity: 0.03,
            bottom: -40,
            left: -20,
          }}
        />

        {/* Brand & chip */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--color-bg-glass)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <CreditCard size={14} style={{ color: "var(--color-accent)" }} />
            <span
              className="text-xs font-bold tracking-wider"
              style={{
                color: brand !== "unknown" ? BRAND_COLORS[brand] : "var(--color-text-muted)",
              }}
            >
              {brand !== "unknown" ? BRAND_LABELS[brand] : "CARD"}
            </span>
          </div>
          {/* Chip */}
          <div
            className="rounded-md"
            style={{
              width: 36,
              height: 26,
              background: "linear-gradient(135deg, var(--color-accent) 0%, rgba(212, 175, 55, 0.5) 100%)",
              opacity: 0.7,
            }}
          />
        </div>

        {/* Card number display */}
        <div className="relative z-10 mb-5">
          <div
            className="flex items-center gap-3 font-mono text-lg tracking-widest"
            style={{ color: "var(--color-text-primary)" }}
          >
            <span>{displayFirst4}</span>
            <span style={{ color: "var(--color-text-muted)", letterSpacing: "0.15em" }}>
              ****
            </span>
            <span style={{ color: "var(--color-text-muted)", letterSpacing: "0.15em" }}>
              ****
            </span>
            <span>{displayLast4}</span>
          </div>
        </div>

        {/* Name & expiry */}
        <div className="flex items-end justify-between relative z-10">
          <div>
            <p
              className="text-[10px] uppercase tracking-wider mb-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("payment", "cardholderName")}
            </p>
            <p
              className="text-sm font-medium tracking-wide uppercase"
              style={{
                color: "var(--color-text-primary)",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] uppercase tracking-wider mb-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("payment", "expiry")}
            </p>
            <p
              className="text-sm font-mono font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {displayExpiry}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cardholder Name */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}
          >
            {t("payment", "cardholderName")}
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            onBlur={() => handleBlur("cardholderName")}
            placeholder="John Doe"
            disabled={isProcessing}
            className="w-full px-4 py-3"
            style={inputStyle(!!errors.cardholderName && !!touched.cardholderName)}
            onFocus={(e) => {
              if (!errors.cardholderName) e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = errors.cardholderName && touched.cardholderName
                ? "#9B4D4D"
                : "var(--color-border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <AnimatePresence>
            {errors.cardholderName && touched.cardholderName && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 text-xs"
                style={{ color: "#9B4D4D" }}
              >
                {errors.cardholderName}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Card Number */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}
          >
            {t("payment", "cardNumber")}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              onBlur={() => handleBlur("cardNumber")}
              placeholder="0000 0000 0000 0000"
              disabled={isProcessing}
              className="w-full px-4 py-3 pr-16"
              style={inputStyle(!!errors.cardNumber && !!touched.cardNumber)}
              onFocus={(e) => {
                if (!errors.cardNumber) e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = errors.cardNumber && touched.cardNumber
                  ? "#9B4D4D"
                  : "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {/* Brand indicator */}
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
            >
              {brand !== "unknown" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: "var(--color-accent-subtle)",
                    color: BRAND_COLORS[brand],
                    letterSpacing: "0.05em",
                  }}
                >
                  {BRAND_LABELS[brand]}
                </motion.span>
              )}
              <Lock size={14} style={{ color: "var(--color-text-muted)" }} />
            </div>
          </div>
          <AnimatePresence>
            {errors.cardNumber && touched.cardNumber && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 text-xs"
                style={{ color: "#9B4D4D" }}
              >
                {errors.cardNumber}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Expiry & CVV row */}
        <div className="flex gap-3">
          {/* Expiry */}
          <div className="flex-1">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}
            >
              {t("payment", "expiry")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={expiry}
              onChange={(e) => handleExpiryChange(e.target.value)}
              onBlur={() => handleBlur("expiry")}
              placeholder="MM/YY"
              disabled={isProcessing}
              className="w-full px-4 py-3"
              style={inputStyle(!!errors.expiry && !!touched.expiry)}
              onFocus={(e) => {
                if (!errors.expiry) e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = errors.expiry && touched.expiry
                  ? "#9B4D4D"
                  : "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <AnimatePresence>
              {errors.expiry && touched.expiry && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 text-xs"
                  style={{ color: "#9B4D4D" }}
                >
                  {errors.expiry}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* CVV */}
          <div className="flex-1">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}
            >
              {t("payment", "cvv")}
            </label>
            <div className="relative">
              <input
                type={showCvv ? "text" : "password"}
                inputMode="numeric"
                value={cvv}
                onChange={(e) => handleCvvChange(e.target.value)}
                onBlur={() => handleBlur("cvv")}
                placeholder={brand === "amex" ? "0000" : "000"}
                disabled={isProcessing}
                className="w-full px-4 py-3 pr-10"
                style={inputStyle(!!errors.cvv && !!touched.cvv)}
                onFocus={(e) => {
                  if (!errors.cvv) e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor = errors.cvv && touched.cvv
                    ? "#9B4D4D"
                    : "var(--color-border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowCvv(!showCvv)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)", cursor: "pointer", background: "none", border: "none" }}
              >
                {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.cvv && touched.cvv && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 text-xs"
                  style={{ color: "#9B4D4D" }}
                >
                  {errors.cvv}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Save card checkbox */}
        {showSaveOption && (
          <motion.label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 cursor-pointer py-2"
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                border: saveCard
                  ? "2px solid var(--color-accent)"
                  : "2px solid var(--color-border-default)",
                background: saveCard ? "var(--color-accent)" : "transparent",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => !isProcessing && setSaveCard(!saveCard)}
            >
              {saveCard && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6L5 9L10 3"
                    stroke="var(--color-text-inverse)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              disabled={isProcessing}
              className="sr-only"
            />
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("payment", "saveCard")}
            </span>
          </motion.label>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <motion.button
            type="button"
            whileHover={isProcessing ? {} : { scale: 1.02 }}
            whileTap={isProcessing ? {} : { scale: 0.98 }}
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl font-medium text-sm"
            style={{
              background: "var(--color-bg-glass)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-default)",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {t("common", "cancel")}
          </motion.button>
          <motion.button
            type="submit"
            whileHover={isProcessing ? {} : { scale: 1.02 }}
            whileTap={isProcessing ? {} : { scale: 0.98 }}
            disabled={isProcessing}
            className="flex-[2] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              background: "var(--gradient-accent)",
              color: "var(--color-text-inverse)",
              boxShadow: "var(--shadow-glow)",
              border: "none",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.7 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                  }}
                />
                {t("payment", "processing")}
              </>
            ) : (
              <>
                <Lock size={14} />
                {t("payment", "payNow")}
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
