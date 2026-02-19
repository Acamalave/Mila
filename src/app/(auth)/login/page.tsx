"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Phone, ChevronDown } from "lucide-react";

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
];

export default function LoginPage() {
  const router = useRouter();
  const { loginByPhone, isAuthenticated, hydrated } = useAuth();
  const { t } = useLanguage();

  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  if (hydrated && isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      setError(t("auth", "phone"));
      return;
    }

    loginByPhone(cleanPhone, selectedCountry.code);

    // Check if admin
    if (cleanPhone === "5551002000") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(180deg, #110D09 0%, #1A1614 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="p-8 sm:p-10"
          style={{
            background: "#FFFFFF",
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo-mila.png"
                alt="Mila Concept"
                width={140}
                height={56}
                className="h-12 w-auto object-contain brightness-0"
                priority
              />
            </div>
            <div
              style={{
                width: 40,
                height: 2,
                background: "linear-gradient(90deg, #8E7B54, #C4A96A)",
                margin: "0 auto 16px",
                borderRadius: 2,
              }}
            />
            <h2
              className="text-xl"
              style={{
                fontFamily: "var(--font-display)",
                color: "#5D5645",
              }}
            >
              {t("auth", "loginTitle")}
            </h2>
            <p className="mt-1" style={{ fontSize: 14, color: "#ABA595" }}>
              {t("auth", "enterPhone")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#5D5645" }}
              >
                {t("auth", "phone")}
              </label>
              <div className="flex gap-2">
                {/* Country Code */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountries(!showCountries)}
                    className="flex items-center gap-1 px-3 py-3 rounded-lg"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(229, 224, 218, 0.8)",
                      color: "#110D09",
                      fontSize: 14,
                      cursor: "pointer",
                      minWidth: 90,
                    }}
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span style={{ fontSize: 13 }}>{selectedCountry.code}</span>
                    <ChevronDown size={14} style={{ color: "#ABA595" }} />
                  </button>

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
                      {countryCodes.map((country) => (
                        <button
                          key={`${country.code}-${country.name}`}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountries(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm"
                          style={{
                            color: "#110D09",
                            cursor: "pointer",
                            background: "transparent",
                            borderBottom: "1px solid rgba(229, 224, 218, 0.3)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(142, 123, 84, 0.06)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <span className="text-lg">{country.flag}</span>
                          <span>{country.name}</span>
                          <span style={{ color: "#ABA595", marginLeft: "auto" }}>{country.code}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Phone Input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="555 100 2000"
                  className="flex-1 px-4 py-3 rounded-lg"
                  style={{
                    background: "#FFFFFF",
                    border: error ? "1px solid #9B4D4D" : "1px solid rgba(229, 224, 218, 0.8)",
                    color: "#110D09",
                    fontSize: 15,
                    outline: "none",
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

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-semibold"
              style={{
                background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                color: "#110D09",
                boxShadow: "0 4px 15px rgba(142, 123, 84, 0.3)",
                border: "none",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {t("auth", "loginButton")}
            </motion.button>
          </form>

          {/* Demo hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-3 rounded-lg"
            style={{ background: "rgba(142, 123, 84, 0.05)" }}
          >
            <p className="text-xs text-center" style={{ color: "#ABA595", lineHeight: 1.5 }}>
              {t("auth", "demoHint")}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
