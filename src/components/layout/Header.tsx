"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Globe, User, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerOpacity = Math.min(0.95, 0.6 + scrollY / 500);
  const headerBlur = Math.min(20, 8 + scrollY / 50);

  const headerStyle: React.CSSProperties = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: `rgba(17, 13, 9, ${headerOpacity})`,
    backdropFilter: `blur(${headerBlur}px)`,
    WebkitBackdropFilter: `blur(${headerBlur}px)`,
    borderBottom: `1px solid rgba(255, 255, 255, ${0.05 + scrollY / 2000})`,
    transition: "background 0.3s ease, backdrop-filter 0.3s ease",
  };

  return (
    <header style={headerStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo-mila.png"
              alt="Mila Concept"
              width={120}
              height={48}
              className="h-8 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#B1B2A6",
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "0.05em",
                transition: "all 0.3s ease",
              }}
            >
              <Globe size={14} />
              <span className="uppercase">{language}</span>
            </motion.button>

            {isAuthenticated && user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(142, 123, 84, 0.15)",
                    border: "1px solid rgba(142, 123, 84, 0.3)",
                    color: "#C4A96A",
                    fontSize: "13px",
                    fontWeight: 500,
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
                        background: "rgba(255, 255, 255, 0.98)",
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <Link
                        href={user.role === "admin" ? "/admin" : "/dashboard"}
                        className="block px-4 py-3 text-sm transition-colors"
                        style={{ color: "#110D09" }}
                        onClick={() => setProfileOpen(false)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F0EB")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {user.role === "admin" ? t("nav", "admin") : t("nav", "dashboard")}
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors"
                        style={{ color: "#9B4D4D" }}
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
                    background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                    color: "#110D09",
                    boxShadow: "0 2px 10px rgba(142, 123, 84, 0.3)",
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
  );
}
