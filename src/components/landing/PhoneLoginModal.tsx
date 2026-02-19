"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Phone, ChevronDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

interface PhoneLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const countryCodes = [
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
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      setError(t("auth", "phone"));
      return;
    }

    loginByPhone(cleanPhone, selectedCountry.code);
    onSuccess?.();
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    // Only allow numbers
    const cleaned = value.replace(/\D/g, "");
    setPhone(cleaned);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center mb-6">
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(142, 123, 84, 0.1), rgba(196, 169, 106, 0.1))",
          }}
        >
          <Phone size={24} style={{ color: "#8E7B54" }} />
        </div>
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "#110D09" }}
        >
          {t("auth", "loginTitle")}
        </h3>
        <p className="mt-1" style={{ fontSize: 14, color: "#ABA595" }}>
          {t("auth", "enterPhone")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone Input with Country Code */}
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "#5D5645" }}
          >
            {t("auth", "phone")}
          </label>
          <div className="flex gap-2">
            {/* Country Code Selector */}
            <div className="relative">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCountries(!showCountries)}
                className="flex items-center gap-1 px-3 py-3 rounded-lg"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(229, 224, 218, 0.8)",
                  color: "#110D09",
                  fontSize: 14,
                  cursor: "pointer",
                  minWidth: 90,
                  transition: "border-color 0.2s ease",
                }}
              >
                <span className="text-lg">{selectedCountry.flag}</span>
                <span style={{ fontSize: 13 }}>{selectedCountry.code}</span>
                <ChevronDown size={14} style={{ color: "#ABA595" }} />
              </motion.button>

              {showCountries && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden z-50"
                  style={{
                    background: "#FFFFFF",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                    border: "1px solid rgba(229, 224, 218, 0.5)",
                    maxHeight: 240,
                    overflowY: "auto" as const,
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
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm"
                      style={{
                        background: selectedCountry.name === country.name ? "rgba(142, 123, 84, 0.06)" : "transparent",
                        color: "#110D09",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        borderBottom: i < countryCodes.length - 1 ? "1px solid rgba(229, 224, 218, 0.3)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(142, 123, 84, 0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedCountry.name === country.name ? "rgba(142, 123, 84, 0.06)" : "transparent")}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                      <span style={{ color: "#ABA595", marginLeft: "auto" }}>{country.code}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Phone Number Input */}
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="555 100 2000"
              className="flex-1 px-4 py-3 rounded-lg"
              style={{
                background: "#FFFFFF",
                border: error ? "1px solid #9B4D4D" : "1px solid rgba(229, 224, 218, 0.8)",
                color: "#110D09",
                fontSize: 15,
                outline: "none",
                transition: "border-color 0.2s ease",
                letterSpacing: "0.05em",
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = "#C4A96A";
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = "rgba(229, 224, 218, 0.8)";
              }}
            />
          </div>
          {error && (
            <p className="mt-1 text-sm" style={{ color: "#9B4D4D" }}>{error}</p>
          )}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 rounded-xl font-semibold text-sm"
          style={{
            background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
            color: "#110D09",
            boxShadow: "0 4px 15px rgba(142, 123, 84, 0.3)",
            border: "none",
            cursor: "pointer",
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
        className="mt-5 p-3 rounded-lg"
        style={{ background: "rgba(142, 123, 84, 0.05)" }}
      >
        <p className="text-xs text-center" style={{ color: "#ABA595", lineHeight: 1.5 }}>
          {t("auth", "demoHint")}
        </p>
      </motion.div>
    </Modal>
  );
}
