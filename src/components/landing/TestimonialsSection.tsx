"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import StarRating from "@/components/ui/StarRating";

const testimonials = [
  {
    id: 1,
    name: "Alexandra Rivera",
    text: {
      en: "The balayage Camila created for me was absolutely stunning. Every detail was perfection — from the consultation to the final result. This salon is in a league of its own.",
      es: "El balayage que Camila creó para mí fue absolutamente impresionante. Cada detalle fue perfección — desde la consulta hasta el resultado final. Este salón está en una liga propia.",
    },
    service: { en: "Balayage Highlights", es: "Mechas Balayage" },
    rating: 5,
  },
  {
    id: 2,
    name: "Maria Santos",
    text: {
      en: "Lucia's HydraGlow facial was the most relaxing and effective treatment I've ever had. My skin has never looked better. The ambiance is pure luxury.",
      es: "El facial HydraGlow de Lucia fue el tratamiento más relajante y efectivo que he tenido. Mi piel nunca se ha visto mejor. El ambiente es puro lujo.",
    },
    service: { en: "HydraGlow Treatment", es: "Tratamiento HydraGlow" },
    rating: 5,
  },
  {
    id: 3,
    name: "Carolina Mendez",
    text: {
      en: "Mariana did my wedding makeup and I couldn't have been happier. She understood exactly the look I wanted and made me feel like the most beautiful bride.",
      es: "Mariana hizo mi maquillaje de boda y no podría haber estado más feliz. Entendió exactamente el look que quería y me hizo sentir como la novia más hermosa.",
    },
    service: { en: "Bridal Makeup", es: "Maquillaje de Novia" },
    rating: 5,
  },
  {
    id: 4,
    name: "Isabella Rojas",
    text: {
      en: "Valentina's nail art is genuine artistry. The gel manicure lasted three weeks without a single chip. I receive compliments everywhere I go.",
      es: "El nail art de Valentina es verdadero arte. La manicura en gel duró tres semanas sin un solo desconchado. Recibo cumplidos donde quiera que voy.",
    },
    service: { en: "Gel Manicure", es: "Manicura en Gel" },
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const { language, t } = useLanguage();
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 bg-surface-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-mila-gold text-sm tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-accent)]">
            {t("testimonials", "subtitle")}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary font-[family-name:var(--font-display)]">
            {t("testimonials", "title")}
          </h2>
        </motion.div>

        {/* Testimonial Card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <Quote size={40} className="mx-auto text-mila-gold/30 mb-6" />
              <p className="text-xl md:text-2xl font-[family-name:var(--font-accent)] italic text-text-primary leading-relaxed mb-8 max-w-2xl mx-auto">
                &ldquo;{testimonials[current].text[language]}&rdquo;
              </p>
              <StarRating rating={testimonials[current].rating} size={18} className="justify-center mb-4" />
              <p className="font-semibold text-text-primary">
                {testimonials[current].name}
              </p>
              <p className="text-sm text-mila-gold">
                {testimonials[current].service[language]}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={prev}
              className="p-3 rounded-full border border-border-default hover:border-mila-gold hover:bg-mila-gold/5 transition-all"
            >
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === current ? "bg-mila-gold w-6" : "bg-mila-taupe/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="p-3 rounded-full border border-border-default hover:border-mila-gold hover:bg-mila-gold/5 transition-all"
            >
              <ChevronRight size={20} className="text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
