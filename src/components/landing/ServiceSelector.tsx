"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scissors, Paintbrush, Sun, Sparkles, Hand, Gem, Flower2, Palette, Droplets, Layers, CircleDot, Zap, Heart, Star, Crown, GraduationCap, Calendar, Check, Wind } from "lucide-react";
import { stylists } from "@/data/stylists";
import { services } from "@/data/services";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";
import { formatPrice } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  Scissors, Paintbrush, Sun, Sparkles, Hand, Gem, Flower2, Palette, Droplets, Layers, CircleDot, Zap, Heart, Star, Crown, GraduationCap, Calendar, Wind,
};

interface ServiceSelectorProps {
  stylistId: string;
  onContinue?: () => void;
}

export default function ServiceSelector({ stylistId, onContinue }: ServiceSelectorProps) {
  const { language, t } = useLanguage();
  const { state, dispatch } = useBooking();

  const stylist = useMemo(() => stylists.find(s => s.id === stylistId), [stylistId]);

  const availableServices = useMemo(() => {
    if (!stylist) return [];
    return services.filter(s => stylist.serviceIds.includes(s.id));
  }, [stylist]);

  const selectedIds = state.selectedServiceIds;
  const isGeneral = state.isGeneralAppointment;

  const totalPrice = useMemo(() => {
    return availableServices
      .filter(s => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [availableServices, selectedIds]);

  const toggleService = (id: string) => {
    dispatch({ type: "TOGGLE_SERVICE", payload: id });
  };

  const toggleGeneral = () => {
    dispatch({ type: "SET_GENERAL_APPOINTMENT", payload: !isGeneral });
  };

  const canContinue = selectedIds.length > 0 || isGeneral;

  const cardStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected
      ? "rgba(142, 123, 84, 0.12)"
      : "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: isSelected ? "1px solid rgba(196, 169, 106, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: "14px 16px",
    cursor: "pointer",
    position: "relative" as const,
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    overflow: "hidden" as const,
    boxShadow: isSelected
      ? "0 4px 20px rgba(142, 123, 84, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      : "0 2px 10px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  });

  const generalCardStyle: React.CSSProperties = {
    background: isGeneral
      ? "linear-gradient(135deg, rgba(142, 123, 84, 0.12), rgba(196, 169, 106, 0.08))"
      : "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: isGeneral ? "1px solid rgba(196, 169, 106, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: "20px 24px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isGeneral
      ? "0 4px 20px rgba(142, 123, 84, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      : "0 2px 10px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  };

  return (
    <section className="py-12 sm:py-16 px-4 relative">
      <div className="max-w-4xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{
              fontFamily: "var(--font-display)",
              color: "#FAF8F5",
            }}
          >
            {t("home", "selectServices")}
          </h2>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, #8E7B54, #C4A96A)", margin: "0 auto", borderRadius: 2 }} />
          <p className="mt-3" style={{ color: "#6B6560", fontSize: 14 }}>
            {stylist?.name}
          </p>
        </motion.div>

        {/* General Consultation Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <motion.div
            whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(142, 123, 84, 0.15)" }}
            whileTap={{ scale: 0.99 }}
            style={generalCardStyle}
            onClick={toggleGeneral}
            className="flex items-center gap-4"
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: isGeneral ? "linear-gradient(135deg, #8E7B54, #C4A96A)" : "rgba(142, 123, 84, 0.12)",
                transition: "all 0.3s ease",
              }}
            >
              <Calendar size={20} style={{ color: isGeneral ? "#FAF8F5" : "#C4A96A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: "#FAF8F5", fontSize: 15 }}>
                {t("home", "generalAppointment")}
              </p>
              <p style={{ color: "#6B6560", fontSize: 13, marginTop: 2 }}>
                {t("home", "generalAppointmentDesc")}
              </p>
            </div>
            <AnimatePresence>
              {isGeneral && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                  }}
                >
                  <Check size={16} color="#FAF8F5" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.06)" }} />
          <span style={{ fontSize: 12, color: "#6B6560", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
            {language === "es" ? "o elige servicios" : "or choose services"}
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.06)" }} />
        </div>

        {/* Services List */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05, delayChildren: 0.15 },
            },
          }}
          className="flex flex-col gap-3 pb-24"
        >
          {availableServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);
            const IconComp = iconMap[service.lucideIcon] || Scissors;

            return (
              <motion.div
                key={service.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                style={cardStyle(isSelected)}
                onClick={() => toggleService(service.id)}
                className="flex items-center gap-4"
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: isSelected
                      ? "linear-gradient(135deg, #8E7B54, #C4A96A)"
                      : "rgba(142, 123, 84, 0.12)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <IconComp size={20} style={{ color: isSelected ? "#FAF8F5" : "#C4A96A" }} />
                </div>

                {/* Service Name + Duration */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium"
                    style={{
                      fontSize: 14,
                      color: "#FAF8F5",
                      lineHeight: 1.3,
                    }}
                  >
                    {service.name[language]}
                  </p>
                </div>

                {/* Price */}
                <span
                  className="flex-shrink-0"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#C4A96A",
                  }}
                >
                  {formatPrice(service.price)}
                </span>

                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                      }}
                    >
                      <Check size={14} color="#FAF8F5" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Floating Bottom Bar */}
        <AnimatePresence>
          {canContinue && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 sm:pb-6 sm:relative sm:mt-8 sm:px-0"
            >
              <div
                className="max-w-4xl mx-auto flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5"
                style={{
                  background: "rgba(20, 20, 20, 0.95)",
                  backdropFilter: "blur(20px)",
                  borderRadius: 16,
                  boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                }}
              >
                <div>
                  {!isGeneral && (
                    <>
                      <p style={{ color: "#C4A96A", fontSize: 20, fontWeight: 700 }}>
                        {formatPrice(totalPrice)}
                      </p>
                      <p style={{ color: "#6B6560", fontSize: 12 }}>
                        {selectedIds.length} {t("home", "totalSelected")}
                      </p>
                    </>
                  )}
                  {isGeneral && (
                    <p style={{ color: "#C4A96A", fontSize: 14, fontWeight: 500 }}>
                      {t("home", "generalAppointment")}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onContinue}
                  className="px-6 py-3 rounded-full font-medium text-sm"
                  style={{
                    background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                    color: "#110D09",
                    boxShadow: "0 4px 15px rgba(142, 123, 84, 0.4)",
                    fontWeight: 600,
                  }}
                >
                  {t("home", "continueToDate")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
