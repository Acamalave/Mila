"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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

  const handleSelect = (id: string) => {
    dispatch({ type: "SET_STYLIST", payload: id });
    onSelect?.(id);
  };

  const currentStylist = allStylists[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  if (!currentStylist) return null;

  return (
    <section className="relative" style={{ minHeight: "100svh" }}>
      {/* Title overlay at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-20 text-center pt-6 sm:pt-10 px-4"
      >
        <h2
          className="text-2xl sm:text-4xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: "#fff",
            letterSpacing: "0.02em",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {t("home", "selectSpecialist")}
        </h2>
        <div style={{ width: 50, height: 2, background: "var(--gradient-accent-h)", margin: "0 auto", borderRadius: 2 }} />
      </motion.div>

      {/* Full-screen photo slider */}
      <div className="relative w-full overflow-hidden" style={{ height: "100svh" }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0"
            onClick={() => handleSelect(currentStylist.id)}
            style={{ cursor: "pointer" }}
          >
            {/* Full-screen image */}
            <Image
              src={currentStylist.avatar}
              alt={currentStylist.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />

            {/* Gradient overlay - bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)",
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-8 sm:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStylist.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-lg mx-auto"
            >
              {/* Glass card with info */}
              <div
                className="p-5 sm:p-6 rounded-2xl text-center"
                style={{
                  background: "rgba(10, 10, 10, 0.6)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <p
                  className="font-bold text-2xl sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                >
                  {currentStylist.name}
                </p>
                <p className="mt-1" style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                  {currentStylist.role[language]}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Star size={16} fill="var(--color-accent)" color="var(--color-accent)" />
                  <span style={{ fontSize: 15, color: "var(--color-accent)", fontWeight: 700 }}>
                    {currentStylist.rating}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    ({currentStylist.reviewCount})
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {currentStylist.specialties.slice(0, 3).map((spec) => (
                    <span
                      key={spec}
                      className="px-3 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Select button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(currentStylist.id);
                  }}
                  className="mt-5 w-full py-3.5 rounded-xl font-semibold text-sm"
                  style={{
                    background: selectedId === currentStylist.id
                      ? "var(--color-accent)"
                      : "var(--gradient-accent)",
                    color: "var(--color-text-inverse)",
                    boxShadow: "var(--shadow-glow)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {selectedId === currentStylist.id
                    ? (language === "es" ? "Seleccionado" : "Selected")
                    : (language === "es" ? "Elegir Especialista" : "Choose Specialist")}
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows + dots */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1, -1); }}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={20} />
            </motion.button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-2">
              {allStylists.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={(e) => { e.stopPropagation(); goTo(i, i > currentIndex ? 1 : -1); }}
                  whileHover={{ scale: 1.3 }}
                  className="rounded-full"
                  style={{
                    width: i === currentIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === currentIndex
                      ? "var(--gradient-accent-h)"
                      : "rgba(255,255,255,0.3)",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    cursor: "pointer",
                    border: "none",
                  }}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1, 1); }}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
