"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-mila-espresso/80 via-mila-espresso/60 to-mila-espresso/90" />
      </div>

      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-mila-gold/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-mila-gold/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-mila-gold text-sm tracking-[0.4em] uppercase mb-6 font-[family-name:var(--font-accent)]">
            {t("hero", "subtitle")}
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-[0.2em] text-mila-ivory font-[family-name:var(--font-display)] mb-4"
        >
          MILA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg tracking-[0.5em] text-mila-gold/80 uppercase mb-8 font-light"
        >
          CONCEPT
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-mila-sage text-lg font-[family-name:var(--font-accent)] italic max-w-xl mx-auto mb-12"
        >
          {t("hero", "description")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/booking"
            className="inline-flex items-center gap-3 px-8 py-4 bg-mila-gold text-mila-espresso font-semibold rounded-lg hover:bg-mila-gold-light transition-all duration-300 group"
          >
            {t("hero", "cta")}
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-mila-gold/30 flex items-start justify-center p-1.5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-mila-gold" />
        </motion.div>
      </motion.div>
    </section>
  );
}
