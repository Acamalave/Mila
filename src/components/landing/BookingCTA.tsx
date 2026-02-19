"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { ArrowRight } from "lucide-react";

export default function BookingCTA() {
  const { t } = useLanguage();

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-mila-espresso/85" />
      </div>

      {/* Gold lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-mila-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-mila-gold/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-mila-ivory font-[family-name:var(--font-display)] mb-6">
            {t("booking", "title")}
          </h2>
          <p className="text-lg text-mila-sage font-[family-name:var(--font-accent)] italic mb-10">
            {t("hero", "description")}
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-3 px-10 py-4 gold-gradient text-mila-espresso font-semibold rounded-lg hover:opacity-90 transition-all duration-300 group text-lg"
          >
            {t("hero", "cta")}
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
