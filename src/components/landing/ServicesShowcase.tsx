"use client";

import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { serviceCategories } from "@/data/services";
import { Scissors, Sparkles, Droplets, Palette } from "lucide-react";
import Link from "next/link";
import { staggerContainer, fadeInUp } from "@/styles/animations";

const iconMap: Record<string, React.ElementType> = {
  Scissors,
  Sparkles,
  Droplets,
  Palette,
};

export default function ServicesShowcase() {
  const { language, t } = useLanguage();

  return (
    <section id="services" className="py-24 bg-surface-primary">
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
            {t("services", "subtitle")}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary font-[family-name:var(--font-display)]">
            {t("services", "title")}
          </h2>
        </motion.div>

        {/* Category Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {serviceCategories.map((category) => {
            const Icon = iconMap[category.icon] || Scissors;
            return (
              <motion.div key={category.id} variants={fadeInUp}>
                <Link href={`/booking?category=${category.id}`}>
                  <div className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer">
                    {/* Background Image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url('${category.image}')` }}
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-mila-espresso/90 via-mila-espresso/40 to-transparent" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-mila-gold/20">
                          <Icon size={20} className="text-mila-gold" />
                        </div>
                        <h3 className="text-xl font-semibold text-mila-ivory font-[family-name:var(--font-display)]">
                          {category.name[language]}
                        </h3>
                      </div>
                      <p className="text-sm text-mila-sage leading-relaxed">
                        {category.description[language]}
                      </p>
                    </div>

                    {/* Hover border */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-mila-gold/30 transition-colors duration-500" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
