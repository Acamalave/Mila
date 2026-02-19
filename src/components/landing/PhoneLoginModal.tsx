"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, ChevronDown, User } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

interface PhoneLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const countryCodes = [
  { code: "+507", flag: "\u{1F1F5}\u{1F1E6}", name: "PA" },
  { code: "+1", flag: "\u{1F1FA}\u{1F1F8}", name: "US" },
  { code: "+1", flag: "\u{1F1E8}\u{1F1E6}", name: "CA" },
  { code: "+52", flag: "\u{1F1F2}\u{1F1FD}", name: "MX" },
  { code: "+57", flag: "\u{1F1E8}\u{1F1F4}", name: "CO" },
  { code: "+54", flag: "\u{1F1E6}\u{1F1F7}", name: "AR" },
  { code: "+55", flag: "\u{1F1E7}\u{1F1F7}", name: "BR" },
  { code: "+56", flag: "\u{1F1E8}\u{1F1F1}", name: "CL" },
  { code: "+34", flag: "\u{1F1EA}\u{1F1F8}", name: "ES" },
  { code: "+44", flag: "\u{1F1EC}\u{1F1E7}", name: "UK" },
  { code: "+33", flag: "\u{1F1EB}\u{1F1F7}", name: "FR" },
  { code: "+49", flag: "\u{1F1E9}\u{1F1EA}", name: "DE" },
  { code: "+39", flag: "\u{1F1EE}\u{1F1F9}", name: "IT" },
];

export default function PhoneLoginModal({ isOpen, onClose, onSuccess }: PhoneLoginModalProps) {
  const { loginByPhone } = useAuth();
  const { language, t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNameError("");
    setPhoneError("");

    let hasError = false;

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setNameError(language === "es" ? "El nombre es obligatorio" : "Name is required");
      hasError = true;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      setPhoneError(language === "es" ? "Ingresa un n\u00famero v\u00e1lido" : "Enter a valid phone number");
      hasError = true;
    }

    if (hasError) return;

    loginByPhone(cleanPhone, selectedCountry.code, trimmedName);
    onSuccess?.();
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setPhone(cleaned);
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    background: "rgba(255, 255, 255, 0.04)",
    border: hasError ? "1px solid #9B4D4D" : "1px solid rgba(255, 255, 255, 0.08)",
    color: "#FAF8F5",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s ease, background 0.2s ease",
    letterSpacing: "0.02em",
    borderRadius: 12,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center mb-5">
        <div
          className="mx-auto mb-3 flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(142, 123, 84, 0.2), rgba(196, 169, 106, 0.15))",
          }}
        >
          <Phone size={22} style={{ color: "#C4A96A" }} />
        </div>
        <h3
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
        >
          {t("auth", "loginTitle")}
        </h3>
        <p className="mt-0.5" style={{ fontSize: 13, color: "#6B6560" }}>
          {t("auth", "enterPhone")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name Input */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#ABA595", letterSpacing: "0.05em" }}
          >
            {t("auth", "name")} *
          </label>
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#6B6560" }}
            >
              <User size={16} />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === "es" ? "Tu nombre completo" : "Your full name"}
              className="w-full pl-10 pr-4 py-3"
              style={inputStyle(!!nameError)}
              onFocus={(e) => {
                if (!nameError) e.currentTarget.style.borderColor = "#C4A96A";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              }}
              onBlur={(e) => {
                if (!nameError) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              }}
            />
          </div>
          <AnimatePresence>
            {nameError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 text-xs"
                style={{ color: "#9B4D4D" }}
              >
                {nameError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Phone Input with Country Code */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#ABA595", letterSpacing: "0.05em" }}
          >
            {t("auth", "phone")} *
          </label>
          <div className="flex gap-2">
            {/* Country Code Selector */}
            <div className="relative flex-shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCountries(!showCountries)}
                className="flex items-center gap-1 px-2.5 py-3"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#FAF8F5",
                  fontSize: 13,
                  cursor: "pointer",
                  minWidth: 82,
                  borderRadius: 12,
                  transition: "border-color 0.2s ease",
                }}
              >
                <span style={{ fontSize: 16 }}>{selectedCountry.flag}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{selectedCountry.code}</span>
                <ChevronDown
                  size={12}
                  style={{
                    color: "#6B6560",
                    transform: showCountries ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </motion.button>

              <AnimatePresence>
                {showCountries && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-50"
                    style={{
                      background: "rgba(20, 20, 20, 0.98)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      maxHeight: 200,
                      overflowY: "auto" as const,
                      width: 180,
                    }}
                  >
                    {countryCodes.map((country, i) => (
                      <button
                        key={`${country.code}-${country.name}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountries(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs"
                        style={{
                          background: selectedCountry.name === country.name ? "rgba(142, 123, 84, 0.15)" : "transparent",
                          color: "#FAF8F5",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          borderBottom: i < countryCodes.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(142, 123, 84, 0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedCountry.name === country.name ? "rgba(142, 123, 84, 0.15)" : "transparent")}
                      >
                        <span style={{ fontSize: 15 }}>{country.flag}</span>
                        <span>{country.name}</span>
                        <span style={{ color: "#6B6560", marginLeft: "auto" }}>{country.code}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phone Number Input */}
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="6000 0000"
              className="flex-1 px-3 py-3 min-w-0"
              style={inputStyle(!!phoneError)}
              onFocus={(e) => {
                if (!phoneError) e.currentTarget.style.borderColor = "#C4A96A";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              }}
              onBlur={(e) => {
                if (!phoneError) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              }}
            />
          </div>
          <AnimatePresence>
            {phoneError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 text-xs"
                style={{ color: "#9B4D4D" }}
              >
                {phoneError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{
            background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
            color: "#110D09",
            boxShadow: "0 4px 15px rgba(142, 123, 84, 0.3)",
            border: "none",
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          {t("auth", "loginButton")}
        </motion.button>
      </form>

      {/* Demo hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 p-2.5 rounded-lg"
        style={{ background: "rgba(142, 123, 84, 0.06)" }}
      >
        <p className="text-xs text-center" style={{ color: "#6B6560", lineHeight: 1.4 }}>
          {t("auth", "demoHint")}
        </p>
      </motion.div>
    </Modal>
  );
}
