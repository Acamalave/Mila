"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Sparkles, Target, Eye, Award } from "lucide-react";

interface BrandStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const milaLetters = [
  { letter: "M", rest: { es: "usas", en: "uses" }, color: "#C4A96A" },
  { letter: "I", rest: { es: "luminadas", en: "lluminated" }, color: "#D4BC7C" },
  { letter: "L", rest: { es: "ibres", en: "iberated" }, color: "#C4A96A" },
  { letter: "A", rest: { es: "uténticas", en: "uthentic" }, color: "#D4BC7C" },
];

const sections = [
  { key: "meaning" as const, textKey: "meaningText" as const, icon: Sparkles },
  { key: "mission" as const, textKey: "missionText" as const, icon: Target },
  { key: "vision" as const, textKey: "visionText" as const, icon: Eye },
  { key: "objectives" as const, textKey: "objectivesText" as const, icon: Award },
];

export default function BrandStoryModal({ isOpen, onClose }: BrandStoryModalProps) {
  const { language, t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showRest, setShowRest] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      setShowRest(false);
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    milaLetters.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveIndex(i), 400 + i * 500));
    });
    timers.push(setTimeout(() => setShowRest(true), 400 + milaLetters.length * 500 + 300));

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "radial-gradient(ellipse at center, rgba(15,12,8,0.97) 0%, rgba(5,4,3,0.99) 100%)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 10000,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(196, 169, 106, 0.2)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(196, 169, 106, 0.6)",
              fontSize: 18,
              transition: "all 0.2s",
            }}
          >
            &times;
          </button>

          {/* Scrollable content */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "80px 24px 60px",
              minHeight: "100vh",
            }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 48 }}
            >
              <Image
                src="/logo-mila-brand.png"
                alt="Milà Concept"
                width={160}
                height={64}
                className="h-12 sm:h-14 w-auto object-contain"
                style={{ opacity: 0.9 }}
              />
            </motion.div>

            {/* Vertical MILA letters */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {milaLetters.map((item, i) => (
                <motion.div
                  key={item.letter}
                  initial={{ opacity: 0, x: -40 }}
                  animate={i <= activeIndex ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: "flex", alignItems: "baseline" }}
                >
                  {/* Large first letter */}
                  <span
                    style={{
                      fontFamily: "var(--font-accent), Georgia, serif",
                      fontSize: "clamp(48px, 10vw, 72px)",
                      fontWeight: 300,
                      lineHeight: 1,
                      color: item.color,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {item.letter}
                  </span>
                  {/* Rest of the word flows from the letter */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={i <= activeIndex ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontFamily: "var(--font-display), sans-serif",
                      fontSize: "clamp(14px, 3vw, 20px)",
                      fontWeight: 300,
                      letterSpacing: "0.25em",
                      textTransform: "lowercase",
                      color: "rgba(245, 240, 235, 0.5)",
                      marginLeft: 2,
                    }}
                  >
                    {item.rest[language as "es" | "en"] ?? item.rest.es}
                  </motion.span>
                </motion.div>
              ))}
            </div>

            {/* Tagline divider */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={showRest ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginTop: 48, textAlign: "center" }}
            >
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: "linear-gradient(90deg, transparent, #C4A96A, transparent)",
                  margin: "0 auto 20px",
                }}
              />
              <p
                style={{
                  fontFamily: "var(--font-accent), Georgia, serif",
                  fontSize: "clamp(13px, 2.5vw, 16px)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "rgba(196, 169, 106, 0.7)",
                  letterSpacing: "0.1em",
                  lineHeight: 1.8,
                }}
              >
                {language === "es"
                  ? "Donde el arte y la sofisticación convergen"
                  : "Where art and sophistication converge"}
              </p>
            </motion.div>

            {/* Meaning, Mission, Vision, Purpose sections */}
            <div style={{ marginTop: 56, maxWidth: 560, width: "100%" }}>
              {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={section.key}
                    initial={{ opacity: 0, y: 24 }}
                    animate={showRest ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                    transition={{
                      delay: i * 0.15,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ marginBottom: 36 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(196, 169, 106, 0.08)",
                          border: "1px solid rgba(196, 169, 106, 0.15)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} style={{ color: "#C4A96A" }} />
                      </div>
                      <h3
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          color: "#C4A96A",
                          margin: 0,
                        }}
                      >
                        {t("brandStory", section.key)}
                      </h3>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.8,
                        color: "rgba(245, 240, 235, 0.5)",
                        paddingLeft: 44,
                        margin: 0,
                      }}
                    >
                      {t("brandStory", section.textKey)}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom spacing */}
            <div style={{ height: 40 }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
