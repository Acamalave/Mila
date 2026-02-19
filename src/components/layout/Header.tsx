"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Globe, User, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Header() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerOpacity = Math.min(0.95, 0.6 + scrollY / 500);
  const headerBlur = Math.min(20, 8 + scrollY / 50);
  const borderOpacity = 0.03 + scrollY / 3000;

  const headerBg =
    theme === "dark"
      ? `rgba(10, 10, 10, ${headerOpacity})`
      : `rgba(245, 245, 247, ${headerOpacity})`;

  const headerBorder =
    theme === "dark"
      ? `1px solid rgba(255, 255, 255, ${borderOpacity})`
      : `1px solid rgba(0, 0, 0, ${borderOpacity})`;

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

  return (
    <header style={headerStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo-mila.png"
              alt="Mila Concept"
              width={160}
              height={64}
              className="h-10 sm:h-14 w-auto object-contain"
              priority
            />
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-accent)",
                transition: "all 0.3s ease",
              }}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex items-center justify-center"
                  >
                    <Sun size={16} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex items-center justify-center"
                  >
                    <Moon size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

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

            {isAuthenticated && user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setProfileOpen(!profileOpen)}
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
  );
}
