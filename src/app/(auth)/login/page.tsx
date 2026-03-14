"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { ChevronDown } from "lucide-react";

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
];

export default function LoginPage() {
  const router = useRouter();
  const { loginByPhone, isAuthenticated, hydrated, user } = useAuth();
  const { t } = useLanguage();
  const { getStylistByPhone } = useStaff();

  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  if (hydrated && isAuthenticated && user) {
    if (user.role === "admin") router.push("/admin");
    else if (user.role === "stylist") router.push("/stylist");
    else router.push("/dashboard");
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

    if (cleanPhone === "5551002000") {
      router.push("/admin");
    } else if (cleanPhone === "5552003000" || getStylistByPhone(cleanPhone)) {
      router.push("/stylist");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: "var(--color-bg-page)",
      }}
    >
      {/* Subtle gold gradient blob */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(196, 169, 106, 0.06) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="p-8 sm:p-10"
          style={{
            background: "var(--color-bg-card)",
            borderRadius: 20,
            boxShadow: "var(--shadow-float)",
            border: "1px solid var(--color-border-default)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo-mila-brand.png"
                alt="Milà Concept"
                width={120}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <div
              style={{
                width: 40,
                height: 1,
                background: "var(--gradient-accent-h)",
                margin: "0 auto 20px",
                borderRadius: 1,
              }}
            />
            <h2
              style={{
                fontFamily: "var(--font-accent)",
                fontSize: "clamp(32px, 8vw, 42px)",
                fontWeight: 400,
                fontStyle: "italic",
                color: "var(--color-text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {t("auth", "loginTitle")}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: 10,
              }}
            >
              {t("auth", "enterPhone")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
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
                      background: "var(--color-bg-input)",
                      border: "1px solid var(--color-border-default)",
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                      cursor: "pointer",
                      minWidth: 90,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span style={{ fontSize: 13 }}>{selectedCountry.code}</span>
                    <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />
                  </button>

                  {showCountries && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden z-50"
                      style={{
                        background: "var(--color-bg-card)",
                        boxShadow: "var(--shadow-float)",
                        border: "1px solid var(--color-border-default)",
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
                            color: "var(--color-text-primary)",
                            cursor: "pointer",
                            background: "transparent",
                            borderBottom: "1px solid var(--color-border-subtle)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <span className="text-lg">{country.flag}</span>
                          <span>{country.name}</span>
                          <span style={{ color: "var(--color-text-muted)", marginLeft: "auto" }}>{country.code}</span>
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
                    background: "var(--color-bg-input)",
                    border: error ? "1px solid #9B4D4D" : "1px solid var(--color-border-default)",
                    color: "var(--color-text-primary)",
                    fontSize: 15,
                    outline: "none",
                    letterSpacing: "0.05em",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
                  }}
                  onBlur={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "var(--color-border-default)";
                    e.currentTarget.style.boxShadow = "none";
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
              className="w-full py-3.5 rounded-xl"
              style={{
                background: "var(--gradient-accent)",
                color: "var(--color-text-inverse)",
                boxShadow: "var(--shadow-glow)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
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
            style={{
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-border-accent)",
            }}
          >
            <p className="text-xs text-center" style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {t("auth", "demoHint")}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
