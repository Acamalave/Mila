"use client";

import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { stylists } from "@/data/stylists";
import { Star, Instagram } from "lucide-react";
import { staggerContainer, fadeInUp } from "@/styles/animations";
import Image from "next/image";

export default function StylistsPreview() {
  const { language, t } = useLanguage();

  return (
    <section id="team" className="py-24 bg-mila-espresso">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <p className="text-mila-gold text-sm tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-accent)]">
            {t("stylists", "subtitle")}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-mila-ivory font-[family-name:var(--font-display)]">
            {t("stylists", "title")}
          </h2>
        </motion.div>

        {/* Stylists Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stylists.map((stylist) => (
            <motion.div
              key={stylist.id}
              variants={fadeInUp}
              className="group text-center"
            >
              {/* Avatar */}
              <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden border-2 border-mila-gold/20 group-hover:border-mila-gold/60 transition-colors duration-500">
                <Image
                  src={stylist.avatar}
                  alt={stylist.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              {/* Info */}
              <h3 className="text-xl font-semibold text-mila-ivory font-[family-name:var(--font-display)] mb-1">
                {stylist.name}
              </h3>
              <p className="text-sm text-mila-gold mb-3">
                {stylist.role[language]}
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Star size={14} className="fill-mila-gold text-mila-gold" />
                <span className="text-sm text-mila-sage">
                  {stylist.rating} ({stylist.reviewCount} {t("stylists", "reviews")})
                </span>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {stylist.specialties.slice(0, 3).map((spec) => (
                  <span
                    key={spec}
                    className="text-xs px-3 py-1 rounded-full bg-white/5 text-mila-sage"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              {/* Instagram */}
              {stylist.instagram && (
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-xs text-mila-taupe hover:text-mila-gold transition-colors"
                >
                  <Instagram size={12} />
                  {stylist.instagram}
                </a>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
