"use client";

import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import Modal from "@/components/ui/Modal";
import { Sparkles, Target, Eye, Award } from "lucide-react";

interface BrandStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  { key: "meaning" as const, textKey: "meaningText" as const, icon: Sparkles },
  { key: "mission" as const, textKey: "missionText" as const, icon: Target },
  { key: "vision" as const, textKey: "visionText" as const, icon: Eye },
  { key: "objectives" as const, textKey: "objectivesText" as const, icon: Award },
];

export default function BrandStoryModal({ isOpen, onClose }: BrandStoryModalProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("brandStory", "title")} size="lg">
      <div className="space-y-8">
        {/* MILÀ Brand Name */}
        <div className="text-center pb-6" style={{ borderBottom: "1px solid var(--color-border-default)" }}>
          <h2
            className="text-4xl sm:text-5xl font-bold tracking-[0.3em]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
            }}
          >
            MILÀ
          </h2>
          <p
            className="text-[10px] tracking-[0.5em] uppercase mt-1"
            style={{ color: "var(--color-accent)" }}
          >
            CONCEPT
          </p>
        </div>

        {/* Sections */}
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full"
                  style={{
                    background: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border-accent)",
                  }}
                >
                  <Icon size={14} style={{ color: "var(--color-accent)" }} />
                </div>
                <h3
                  className="text-xs font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "var(--color-accent)" }}
                >
                  {t("brandStory", section.key)}
                </h3>
              </div>
              <p
                className="text-sm leading-relaxed pl-11"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("brandStory", section.textKey)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </Modal>
  );
}
