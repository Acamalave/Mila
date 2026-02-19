import type { ServiceCategory, Service } from "@/types/service";

export const serviceCategories: ServiceCategory[] = [
  {
    id: "cat-hair",
    name: { en: "Hair", es: "Cabello" },
    description: {
      en: "Cuts, coloring, treatments, and styling for every hair type",
      es: "Cortes, coloración, tratamientos y peinados para todo tipo de cabello",
    },
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    icon: "Scissors",
  },
  {
    id: "cat-nails",
    name: { en: "Nails", es: "Uñas" },
    description: {
      en: "Manicures, pedicures, gel, and nail art designs",
      es: "Manicuras, pedicuras, gel y diseños de nail art",
    },
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    icon: "Sparkles",
  },
  {
    id: "cat-skin",
    name: { en: "Skin", es: "Piel" },
    description: {
      en: "Facials, peels, and rejuvenating skin treatments",
      es: "Faciales, peeling y tratamientos rejuvenecedores para la piel",
    },
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
    icon: "Droplets",
  },
  {
    id: "cat-makeup",
    name: { en: "Makeup", es: "Maquillaje" },
    description: {
      en: "Professional makeup for events, bridal, and everyday looks",
      es: "Maquillaje profesional para eventos, novias y looks del día a día",
    },
    image:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",
    icon: "Palette",
  },
];

export const services: Service[] = [
  // ── Hair Services ──────────────────────────────────────────────
  {
    id: "svc-hair-cut",
    categoryId: "cat-hair",
    name: { en: "Haircut & Style", es: "Corte y Peinado" },
    description: {
      en: "Precision haircut with wash, blow-dry, and finishing style tailored to your face shape",
      es: "Corte de precisión con lavado, secado y peinado final adaptado a la forma de tu rostro",
    },
    durationMinutes: 60,
    price: 65,
    lucideIcon: "Scissors",
    image:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80",
  },
  {
    id: "svc-hair-color",
    categoryId: "cat-hair",
    name: { en: "Full Color", es: "Coloración Completa" },
    description: {
      en: "Complete single-process color application with premium ammonia-free dyes",
      es: "Aplicación completa de color en un solo proceso con tintes premium sin amoníaco",
    },
    durationMinutes: 120,
    price: 150,
    lucideIcon: "Paintbrush",
    image:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },
  {
    id: "svc-hair-highlights",
    categoryId: "cat-hair",
    name: { en: "Balayage Highlights", es: "Mechas Balayage" },
    description: {
      en: "Hand-painted highlights for a natural, sun-kissed gradient effect",
      es: "Mechas pintadas a mano para un efecto degradado natural y luminoso",
    },
    durationMinutes: 180,
    price: 250,
    lucideIcon: "Sun",
    image:
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80",
  },
  {
    id: "svc-hair-treatment",
    categoryId: "cat-hair",
    name: { en: "Keratin Treatment", es: "Tratamiento de Keratina" },
    description: {
      en: "Deep smoothing keratin treatment that eliminates frizz and adds shine for up to 3 months",
      es: "Tratamiento profundo de keratina que elimina el frizz y aporta brillo hasta por 3 meses",
    },
    durationMinutes: 150,
    price: 300,
    lucideIcon: "Sparkles",
    image:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80",
  },

  // ── Nail Services ──────────────────────────────────────────────
  {
    id: "svc-nails-classic-mani",
    categoryId: "cat-nails",
    name: { en: "Classic Manicure", es: "Manicura Clásica" },
    description: {
      en: "Nail shaping, cuticle care, hand massage, and polish application",
      es: "Limado de uñas, cuidado de cutículas, masaje de manos y aplicación de esmalte",
    },
    durationMinutes: 30,
    price: 35,
    lucideIcon: "Hand",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
  },
  {
    id: "svc-nails-gel",
    categoryId: "cat-nails",
    name: { en: "Gel Manicure", es: "Manicura en Gel" },
    description: {
      en: "Long-lasting gel polish manicure with LED curing for a chip-free finish",
      es: "Manicura de esmalte en gel de larga duración con curado LED para un acabado impecable",
    },
    durationMinutes: 45,
    price: 55,
    lucideIcon: "Gem",
    image:
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
  },
  {
    id: "svc-nails-pedicure",
    categoryId: "cat-nails",
    name: { en: "Spa Pedicure", es: "Pedicura Spa" },
    description: {
      en: "Luxurious pedicure with exfoliation, paraffin mask, extended massage, and polish",
      es: "Pedicura de lujo con exfoliación, máscara de parafina, masaje extendido y esmaltado",
    },
    durationMinutes: 60,
    price: 70,
    lucideIcon: "Flower2",
    image:
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
  },
  {
    id: "svc-nails-art",
    categoryId: "cat-nails",
    name: { en: "Nail Art Design", es: "Diseño de Nail Art" },
    description: {
      en: "Custom hand-painted nail art with embellishments and intricate designs",
      es: "Diseño de nail art personalizado con adornos y detalles pintados a mano",
    },
    durationMinutes: 90,
    price: 95,
    lucideIcon: "Palette",
    image:
      "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80",
  },

  // ── Skin Services ──────────────────────────────────────────────
  {
    id: "svc-skin-facial",
    categoryId: "cat-skin",
    name: { en: "Signature Facial", es: "Facial Signature" },
    description: {
      en: "Deep-cleansing facial with extraction, custom mask, and hydrating serum infusion",
      es: "Facial de limpieza profunda con extracción, mascarilla personalizada e infusión de sérum hidratante",
    },
    durationMinutes: 60,
    price: 95,
    lucideIcon: "Droplets",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
  },
  {
    id: "svc-skin-peel",
    categoryId: "cat-skin",
    name: { en: "Chemical Peel", es: "Peeling Químico" },
    description: {
      en: "Professional-grade chemical peel to improve texture, tone, and reduce fine lines",
      es: "Peeling químico de grado profesional para mejorar textura, tono y reducir líneas finas",
    },
    durationMinutes: 45,
    price: 120,
    lucideIcon: "Layers",
    image:
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80",
  },
  {
    id: "svc-skin-microderm",
    categoryId: "cat-skin",
    name: { en: "Microdermabrasion", es: "Microdermoabrasión" },
    description: {
      en: "Crystal-free microdermabrasion for gentle exfoliation and collagen stimulation",
      es: "Microdermoabrasión sin cristales para exfoliación suave y estimulación de colágeno",
    },
    durationMinutes: 45,
    price: 110,
    lucideIcon: "CircleDot",
    image:
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80",
  },
  {
    id: "svc-skin-hydra",
    categoryId: "cat-skin",
    name: { en: "HydraGlow Treatment", es: "Tratamiento HydraGlow" },
    description: {
      en: "Multi-step hydration treatment combining LED therapy, oxygen infusion, and hyaluronic mask",
      es: "Tratamiento de hidratación en múltiples pasos con terapia LED, infusión de oxígeno y mascarilla de ácido hialurónico",
    },
    durationMinutes: 75,
    price: 160,
    lucideIcon: "Zap",
    image:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",
  },

  // ── Makeup Services ────────────────────────────────────────────
  {
    id: "svc-makeup-everyday",
    categoryId: "cat-makeup",
    name: { en: "Everyday Glam", es: "Glam de Día" },
    description: {
      en: "Polished everyday makeup look using premium products for a natural, radiant finish",
      es: "Look de maquillaje diario pulido con productos premium para un acabado natural y radiante",
    },
    durationMinutes: 45,
    price: 75,
    lucideIcon: "Heart",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
  },
  {
    id: "svc-makeup-event",
    categoryId: "cat-makeup",
    name: { en: "Event Makeup", es: "Maquillaje para Eventos" },
    description: {
      en: "Full glam makeup for special occasions with airbrush finish and false lashes",
      es: "Maquillaje full glam para ocasiones especiales con acabado aerógrafo y pestañas postizas",
    },
    durationMinutes: 60,
    price: 120,
    lucideIcon: "Star",
    image:
      "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800&q=80",
  },
  {
    id: "svc-makeup-bridal",
    categoryId: "cat-makeup",
    name: { en: "Bridal Makeup", es: "Maquillaje de Novia" },
    description: {
      en: "Complete bridal makeup with trial session, long-wear application, and touch-up kit",
      es: "Maquillaje de novia completo con sesión de prueba, aplicación de larga duración y kit de retoque",
    },
    durationMinutes: 120,
    price: 350,
    lucideIcon: "Crown",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
  },
  {
    id: "svc-makeup-lesson",
    categoryId: "cat-makeup",
    name: { en: "Makeup Lesson", es: "Clase de Maquillaje" },
    description: {
      en: "One-on-one makeup lesson covering techniques, product selection, and a personalized routine",
      es: "Clase de maquillaje personalizada cubriendo técnicas, selección de productos y rutina a medida",
    },
    durationMinutes: 90,
    price: 100,
    lucideIcon: "GraduationCap",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
  },
];
