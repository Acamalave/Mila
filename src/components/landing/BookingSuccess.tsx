"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Calendar, Clock, User as UserIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { stylists } from "@/data/stylists";
import { services } from "@/data/services";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";
import { formatPrice } from "@/lib/utils";

interface BookingSuccessProps {
  onGoToDashboard?: () => void;
  onBookAnother?: () => void;
}

// Confetti particle component
function Particle({ delay, x }: { delay: number; x: number }) {
  const size = 4 + Math.random() * 6;
  const colors = ["#C4A96A", "#8E7B54", "#ABA595", "#D4C5A0"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -120 - Math.random() * 200],
        x: [x, x + (Math.random() - 0.5) * 150],
        scale: [0, 1, 1, 0.5],
        rotate: [0, Math.random() * 360],
      }}
      transition={{
        duration: 2.5 + Math.random() * 1.5,
        delay: delay,
        ease: "easeOut",
      }}
      style={{
        position: "absolute",
        bottom: "40%",
        left: "50%",
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? "50%" : 2,
        background: color,
        pointerEvents: "none",
      }}
    />
  );
}

export default function BookingSuccess({ onGoToDashboard, onBookAnother }: BookingSuccessProps) {
  const { language, t } = useLanguage();
  const { state } = useBooking();
  const [showParticles, setShowParticles] = useState(false);
  const locale = language === "es" ? es : enUS;

  useEffect(() => {
    const timer = setTimeout(() => setShowParticles(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const stylist = stylists.find((s) => s.id === state.selectedStylistId);
  const selectedServices = services.filter((s) => state.selectedServiceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const dateStr = state.selectedDate
    ? format(new Date(state.selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy", { locale })
    : "";

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };

  // Generate particle positions
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    delay: 0.3 + Math.random() * 0.8,
    x: (Math.random() - 0.5) * 100,
  }));

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(180deg, #FAF8F5 0%, #F5F0EB 50%, #FAF8F5 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating Particles */}
      {showParticles && particles.map((p) => (
        <Particle key={p.id} delay={p.delay} x={p.x} />
      ))}

      <div className="w-full max-w-md relative z-10">
        {/* Checkmark Animation */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
            className="flex items-center justify-center"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
              boxShadow: "0 10px 40px rgba(142, 123, 84, 0.35), 0 0 0 8px rgba(142, 123, 84, 0.1)",
            }}
          >
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Check size={40} color="#FAF8F5" strokeWidth={3} />
            </motion.div>
          </motion.div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <h2
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "#110D09" }}
          >
            {t("home", "bookingConfirmed")}
          </h2>
          <p style={{ color: "#ABA595", fontSize: 15 }}>
            {t("home", "bookingConfirmedDesc")}
          </p>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: "0 4px 20px rgba(93, 86, 69, 0.08)",
            border: "1px solid rgba(229, 224, 218, 0.5)",
            padding: "24px",
          }}
        >
          {/* Specialist */}
          <div className="flex items-center gap-3 pb-4" style={{ borderBottom: "1px solid rgba(229, 224, 218, 0.5)" }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(142, 123, 84, 0.08)",
              }}
            >
              <UserIcon size={18} style={{ color: "#8E7B54" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#ABA595" }}>
                {language === "es" ? "Especialista" : "Specialist"}
              </p>
              <p style={{ fontSize: 15, color: "#110D09", fontWeight: 600 }}>
                {stylist?.name}
              </p>
            </div>
          </div>

          {/* Services */}
          <div className="py-4" style={{ borderBottom: "1px solid rgba(229, 224, 218, 0.5)" }}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(142, 123, 84, 0.08)",
                }}
              >
                <Sparkles size={18} style={{ color: "#8E7B54" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: "#ABA595" }}>
                  {language === "es" ? "Servicios" : "Services"}
                </p>
                {state.isGeneralAppointment ? (
                  <p style={{ fontSize: 15, color: "#110D09", fontWeight: 600 }}>
                    {t("home", "generalAppointment")}
                  </p>
                ) : (
                  <div>
                    {selectedServices.map((s) => (
                      <p key={s.id} style={{ fontSize: 14, color: "#110D09" }}>
                        {s.name[language]}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="py-4" style={{ borderBottom: "1px solid rgba(229, 224, 218, 0.5)" }}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(142, 123, 84, 0.08)",
                }}
              >
                <Calendar size={18} style={{ color: "#8E7B54" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: "#ABA595" }}>
                  {language === "es" ? "Fecha y hora" : "Date & Time"}
                </p>
                <p style={{ fontSize: 15, color: "#110D09", fontWeight: 600 }} className="capitalize">
                  {dateStr}
                </p>
                {state.selectedTimeSlot && (
                  <p style={{ fontSize: 14, color: "#8E7B54" }}>
                    {formatTimeDisplay(state.selectedTimeSlot.startTime)} - {formatTimeDisplay(state.selectedTimeSlot.endTime)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Total */}
          {!state.isGeneralAppointment && totalPrice > 0 && (
            <div className="pt-4 flex items-center justify-between">
              <span style={{ fontSize: 14, color: "#ABA595" }}>Total</span>
              <span style={{ fontSize: 20, color: "#8E7B54", fontWeight: 700 }}>
                {formatPrice(totalPrice)}
              </span>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-6 space-y-3"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoToDashboard}
            className="w-full py-4 rounded-2xl font-semibold text-base"
            style={{
              background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
              color: "#110D09",
              boxShadow: "0 8px 30px rgba(142, 123, 84, 0.35)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("home", "goToDashboard")}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookAnother}
            className="w-full py-4 rounded-2xl font-medium text-base"
            style={{
              background: "transparent",
              color: "#8E7B54",
              border: "2px solid rgba(142, 123, 84, 0.3)",
              borderRadius: 16,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {t("home", "bookAnother")}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
