"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { stylists } from "@/data/stylists";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";

interface SpecialistSliderProps {
  onSelect?: (stylistId: string) => void;
}

const rotatingRingStyle = (size: number): React.CSSProperties => ({
  position: "absolute",
  top: -8,
  left: -8,
  width: size + 16,
  height: size + 16,
  borderRadius: "50%",
  background: "conic-gradient(from 0deg, #8E7B54, #C4A96A, #D4C5A0, #8E7B54)",
  filter: "blur(8px)",
  opacity: 0.6,
  zIndex: 0,
});

export default function SpecialistSlider({ onSelect }: SpecialistSliderProps) {
  const { language, t } = useLanguage();
  const { state, dispatch } = useBooking();
  const [currentIndex, setCurrentIndex] = useState(0);

  const selectedId = state.selectedStylistId;

  const goTo = (index: number) => {
    const wrapped = ((index % stylists.length) + stylists.length) % stylists.length;
    setCurrentIndex(wrapped);
  };

  const handleSelect = (id: string) => {
    dispatch({ type: "SET_STYLIST", payload: id });
    onSelect?.(id);
  };

  // Get visible stylists (for desktop: show 3 at a time)
  const getVisibleIndices = () => {
    const total = stylists.length;
    const prev = ((currentIndex - 1) + total) % total;
    const next = (currentIndex + 1) % total;
    return [prev, currentIndex, next];
  };

  const visibleIndices = getVisibleIndices();
  const currentStylist = stylists[currentIndex];

  const ringStyle = (isSelected: boolean, isCenter: boolean): React.CSSProperties => ({
    width: isCenter ? 240 : 180,
    height: isCenter ? 240 : 180,
    borderRadius: "50%",
    border: isSelected ? "3px solid #C4A96A" : "3px solid transparent",
    boxShadow: isSelected
      ? "0 0 30px rgba(142, 123, 84, 0.4), 0 0 60px rgba(142, 123, 84, 0.15)"
      : "0 8px 30px rgba(0, 0, 0, 0.5)",
    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    cursor: "pointer",
    overflow: "hidden",
    position: "relative" as const,
    flexShrink: 0,
  });

  const mobileRingStyle = (isSelected: boolean): React.CSSProperties => ({
    width: 200,
    height: 200,
    borderRadius: "50%",
    border: isSelected ? "3px solid #C4A96A" : "3px solid rgba(255, 255, 255, 0.1)",
    boxShadow: isSelected
      ? "0 0 40px rgba(142, 123, 84, 0.4), 0 0 80px rgba(142, 123, 84, 0.15)"
      : "0 10px 40px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
    position: "relative" as const,
    cursor: "pointer",
  });

  return (
    <section className="py-12 sm:py-20 px-4 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2
            className="text-2xl sm:text-4xl font-bold mb-3"
            style={{
              fontFamily: "var(--font-display)",
              color: "#FAF8F5",
              letterSpacing: "0.02em",
            }}
          >
            {t("home", "selectSpecialist")}
          </h2>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, #8E7B54, #C4A96A)", margin: "0 auto", borderRadius: 2 }} />
        </motion.div>

        {/* Desktop Slider (3 visible) */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center gap-8">
            {/* Left Arrow */}
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => goTo(currentIndex - 1)}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#C4A96A",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <ChevronLeft size={22} />
            </motion.button>

            {/* Stylists */}
            <div className="flex items-center justify-center gap-10">
              {visibleIndices.map((idx, i) => {
                const stylist = stylists[idx];
                const isCenter = i === 1;
                const isSelected = stylist.id === selectedId;
                const photoSize = isCenter ? 240 : 180;

                return (
                  <motion.div
                    key={stylist.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: isCenter ? 1 : 0.65,
                      scale: isCenter ? 1 : 0.78,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="flex flex-col items-center"
                    onClick={() => {
                      if (isCenter) {
                        handleSelect(stylist.id);
                      } else {
                        goTo(idx);
                      }
                    }}
                  >
                    {/* Photo container with rotating ring */}
                    <div style={{ position: "relative" }}>
                      {isCenter && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                          style={rotatingRingStyle(photoSize)}
                        />
                      )}
                      <motion.div
                        whileHover={{ scale: isCenter ? 1.05 : 0.83 }}
                        style={{ ...ringStyle(isSelected, isCenter), position: "relative", zIndex: 1 }}
                      >
                        <Image
                          src={stylist.avatar}
                          alt={stylist.name}
                          fill
                          className="object-cover"
                          sizes={isCenter ? "240px" : "180px"}
                        />
                      </motion.div>
                    </div>
                    <motion.div
                      className="mt-4 text-center"
                      animate={{ opacity: isCenter ? 1 : 0.5 }}
                    >
                      <p
                        className="font-semibold"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: isCenter ? 18 : 14,
                          color: "#FAF8F5",
                        }}
                      >
                        {stylist.name}
                      </p>
                      <p
                        className="mt-0.5"
                        style={{
                          fontSize: isCenter ? 13 : 11,
                          color: "#ABA595",
                        }}
                      >
                        {stylist.role[language]}
                      </p>
                      {isCenter && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-center gap-1 mt-2"
                        >
                          <Star size={14} fill="#C4A96A" color="#C4A96A" />
                          <span style={{ fontSize: 13, color: "#C4A96A", fontWeight: 600 }}>
                            {stylist.rating}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B6560" }}>
                            ({stylist.reviewCount})
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right Arrow */}
            <motion.button
              whileHover={{ scale: 1.1, x: 2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => goTo(currentIndex + 1)}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#C4A96A",
                cursor: "pointer",
              }}
            >
              <ChevronRight size={22} />
            </motion.button>
          </div>
        </div>

        {/* Mobile Slider (1 visible) */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => goTo(currentIndex - 1)}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#C4A96A",
              }}
            >
              <ChevronLeft size={20} />
            </motion.button>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col items-center"
                onClick={() => handleSelect(currentStylist.id)}
              >
                {/* Mobile photo container with rotating ring */}
                <div style={{ position: "relative" }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    style={rotatingRingStyle(200)}
                  />
                  <div style={{ ...mobileRingStyle(currentStylist.id === selectedId), position: "relative", zIndex: 1 }}>
                    <Image
                      src={currentStylist.avatar}
                      alt={currentStylist.name}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p
                    className="font-semibold text-lg"
                    style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
                  >
                    {currentStylist.name}
                  </p>
                  <p style={{ fontSize: 13, color: "#ABA595", marginTop: 2 }}>
                    {currentStylist.role[language]}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Star size={14} fill="#C4A96A" color="#C4A96A" />
                    <span style={{ fontSize: 13, color: "#C4A96A", fontWeight: 600 }}>
                      {currentStylist.rating}
                    </span>
                    <span style={{ fontSize: 12, color: "#6B6560" }}>
                      ({currentStylist.reviewCount})
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => goTo(currentIndex + 1)}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#C4A96A",
              }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {stylists.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => goTo(i)}
              whileHover={{ scale: 1.3 }}
              className="rounded-full"
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === currentIndex
                  ? "linear-gradient(90deg, #8E7B54, #C4A96A)"
                  : "rgba(255, 255, 255, 0.15)",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                cursor: "pointer",
                border: "none",
              }}
            />
          ))}
        </div>

        {/* Selected indicator */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center mt-6"
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(142, 123, 84, 0.15)",
                  border: "1px solid rgba(142, 123, 84, 0.3)",
                  color: "#C4A96A",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {stylists.find(s => s.id === selectedId)?.name}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
