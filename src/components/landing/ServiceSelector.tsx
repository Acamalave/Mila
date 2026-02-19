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
      ? "var(--color-bg-glass-selected)"
      : "var(--color-bg-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: isSelected ? "1px solid var(--color-border-accent)" : "1px solid var(--color-border-default)",
    borderRadius: 16,
    padding: "14px 16px",
    cursor: "pointer",
    position: "relative" as const,
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    overflow: "hidden" as const,
    boxShadow: isSelected
      ? "var(--shadow-card-selected)"
      : "var(--shadow-card)",
  });

  const generalCardStyle: React.CSSProperties = {
    background: isGeneral
      ? "var(--color-bg-glass-selected)"
      : "var(--color-bg-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: isGeneral ? "1px solid var(--color-border-accent)" : "1px solid var(--color-border-default)",
    borderRadius: 16,
    padding: "20px 24px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isGeneral
      ? "var(--shadow-card-selected)"
      : "var(--shadow-card)",
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
              color: "var(--color-text-primary)",
            }}
          >
            {t("home", "selectServices")}
          </h2>
          <div style={{ width: 50, height: 2, background: "var(--gradient-accent-h)", margin: "0 auto", borderRadius: 2 }} />
          <p className="mt-3" style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
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
            whileHover={{ y: -2, boxShadow: "var(--shadow-card-hover)" }}
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
                background: isGeneral ? "var(--gradient-accent)" : "var(--color-bg-glass-selected)",
                transition: "all 0.3s ease",
              }}
            >
              <Calendar size={20} style={{ color: isGeneral ? "var(--color-text-inverse)" : "var(--color-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: 15 }}>
                {t("home", "generalAppointment")}
              </p>
              <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 2 }}>
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
                    background: "var(--gradient-accent)",
                  }}
                >
                  <Check size={16} color="var(--color-text-inverse)" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
            {language === "es" ? "o elige servicios" : "or choose services"}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
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
                      ? "var(--gradient-accent)"
                      : "var(--color-bg-glass-selected)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <IconComp size={20} style={{ color: isSelected ? "var(--color-text-inverse)" : "var(--color-accent)" }} />
                </div>

                {/* Service Name + Duration */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium"
                    style={{
                      fontSize: 14,
                      color: "var(--color-text-primary)",
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
                    color: "var(--color-accent)",
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
                        background: "var(--gradient-accent)",
                      }}
                    >
                      <Check size={14} color="var(--color-text-inverse)" strokeWidth={3} />
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
                  background: "var(--color-bg-overlay)",
                  backdropFilter: "blur(20px)",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-float)",
                  transition: "all 0.3s ease",
                }}
              >
                <div>
                  {!isGeneral && (
                    <>
                      <p style={{ color: "var(--color-accent)", fontSize: 20, fontWeight: 700 }}>
                        {formatPrice(totalPrice)}
                      </p>
                      <p style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                        {selectedIds.length} {t("home", "totalSelected")}
                      </p>
                    </>
                  )}
                  {isGeneral && (
                    <p style={{ color: "var(--color-accent)", fontSize: 14, fontWeight: 500 }}>
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
                    background: "var(--gradient-accent)",
                    color: "var(--color-text-inverse)",
                    boxShadow: "var(--shadow-glow)",
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
