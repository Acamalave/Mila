"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStaff } from "@/providers/StaffProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";

interface SpecialistSliderProps {
  onSelect?: (stylistId: string) => void;
}

export default function SpecialistSlider({ onSelect }: SpecialistSliderProps) {
  const { language, t } = useLanguage();
  const { state, dispatch } = useBooking();
  const { allStylists } = useStaff();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const selectedId = state.selectedStylistId;

  const goTo = useCallback((index: number, dir: number) => {
    const wrapped = ((index % allStylists.length) + allStylists.length) % allStylists.length;
    setDirection(dir);
    setCurrentIndex(wrapped);
  }, [allStylists.length]);

  const handleSelect = useCallback((id: string) => {
    dispatch({ type: "SET_STYLIST", payload: id });
    onSelect?.(id);
  }, [dispatch, onSelect]);

  const currentStylist = allStylists[currentIndex];

  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 80 : -80,
      scale: 1.02,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -80 : 80,
      scale: 0.98,
    }),
  };

  // Split first name and last name for editorial display
  const nameParts = currentStylist.name.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  return (
    <section className="relative w-full" style={{ minHeight: "100svh" }}>
      {/* Full-screen editorial image */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={currentStylist.avatar}
            alt={currentStylist.name}
            fill
            className="object-cover object-top"
            sizes="100vw"
            priority
          />
          {/* Gradient overlays for editorial feel + text contrast */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.8) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 60%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Editorial name overlay - large typography */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ zIndex: 2 }}>
        {/* Top: Large editorial name */}
        <div className="flex-1 flex items-center justify-center px-6 pt-20">
          <AnimatePresence initial={true} mode="wait">
            <motion.div
              key={`name-${currentIndex}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <h1
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "clamp(3.5rem, 12vw, 9rem)",
                  fontWeight: 300,
                  color: "rgba(255, 255, 255, 0.95)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  textShadow: "0 2px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)",
                }}
              >
                {firstName}
              </h1>
              {lastName && (
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(0.7rem, 2vw, 1rem)",
                    fontWeight: 300,
                    color: "rgba(255, 255, 255, 0.6)",
                    letterSpacing: "0.35em",
                    textTransform: "uppercase",
                    marginTop: "0.75rem",
                  }}
                >
                  {lastName}
                </p>
              )}
              <p
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "var(--color-accent)",
                  letterSpacing: "0.05em",
                  marginTop: "0.5rem",
                }}
              >
                {currentStylist.role[language]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom: Selector controls */}
        <div className="pointer-events-auto px-4 sm:px-8 pb-8 sm:pb-12">
          {/* Navigation + Select button */}
          <div className="max-w-lg mx-auto">
            {/* Dot indicators with names */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-5">
              {allStylists.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => goTo(i, i > currentIndex ? 1 : -1)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-display)",
                      fontWeight: i === currentIndex ? 500 : 300,
                      color: i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      transition: "all 0.4s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.name.split(" ")[0]}
                  </span>
                  <div
                    style={{
                      width: i === currentIndex ? 24 : 12,
                      height: 2,
                      borderRadius: 1,
                      background: i === currentIndex ? "#fff" : "rgba(255,255,255,0.2)",
                      transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </motion.button>
              ))}
            </div>

            {/* Arrow nav + Choose button */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => goTo(currentIndex - 1, -1)}
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(currentStylist.id)}
                className="flex-1 max-w-[220px] py-3.5 rounded-full text-center"
                style={{
                  background: selectedId === currentStylist.id
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  border: selectedId === currentStylist.id
                    ? "1px solid rgba(255,255,255,1)"
                    : "1px solid rgba(255,255,255,0.2)",
                  color: selectedId === currentStylist.id ? "#0a0a0a" : "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {selectedId === currentStylist.id
                  ? (language === "es" ? "Seleccionada" : "Selected")
                  : (language === "es" ? "Elegir" : "Choose")}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => goTo(currentIndex + 1, 1)}
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <ChevronRight size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
