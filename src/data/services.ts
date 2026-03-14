import type { ServiceCategory, Service } from "@/types/service";

export const serviceCategories: ServiceCategory[] = [
  {
    id: "cat-wash",
    name: { en: "Wash & Treatments", es: "Lavado y Tratamientos" },
    description: {
      en: "Professional hair washing and deep treatment services",
      es: "Servicios profesionales de lavado y tratamientos capilares profundos",
    },
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    icon: "Droplets",
  },
  {
    id: "cat-treatment",
    name: { en: "Treatments", es: "Tratamientos" },
    description: {
      en: "Restorative and intensive hair treatments for all hair types",
      es: "Tratamientos restaurativos e intensivos para todo tipo de cabello",
    },
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    icon: "Sparkles",
  },
  {
    id: "cat-blowout",
    name: { en: "Blower & Hairstyles", es: "Blower y Peinados" },
    description: {
      en: "Professional blow-drying and styling for every occasion",
      es: "Secado profesional y estilismo para toda ocasión",
    },
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    icon: "Wind",
  },
  {
    id: "cat-updo",
    name: { en: "Updos & Formal Styles", es: "Peinados Formales" },
    description: {
      en: "Elegant updos and formal hairstyles for special occasions",
      es: "Recogidos elegantes y peinados formales para ocasiones especiales",
    },
    image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80",
    icon: "Crown",
  },
  {
    id: "cat-makeup",
    name: { en: "Makeup", es: "Maquillaje" },
    description: {
      en: "Professional makeup for social events, weddings, and special occasions",
      es: "Maquillaje profesional para eventos sociales, bodas y ocasiones especiales",
    },
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",
    icon: "Palette",
  },
  {
    id: "cat-color",
    name: { en: "Color & Balayage", es: "Color Creativo y Balayage" },
    description: {
      en: "Creative color, balayage, and highlight designs tailored to you",
      es: "Color creativo, balayage y diseños de mechas personalizados",
    },
    image: "https://images.unsplash.com/photo-1562322140-8baeacacf859?w=800&q=80",
    icon: "Paintbrush",
  },
  {
    id: "cat-cuts",
    name: { en: "Haircuts", es: "Cortes" },
    description: {
      en: "Precision haircuts for women and men with the latest techniques",
      es: "Cortes de precisión para damas y caballeros con las últimas técnicas",
    },
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    icon: "Scissors",
  },
  {
    id: "cat-vip",
    name: { en: "VIP Masterclass", es: "Cursos VIP" },
    description: {
      en: "Exclusive private masterclasses with our top specialists",
      es: "Masterclass exclusivas privadas con nuestras mejores especialistas",
    },
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    icon: "GraduationCap",
  },
  {
    id: "cat-packages",
    name: { en: "Packages & Consultations", es: "Paquetes y Consultas" },
    description: {
      en: "Special packages and complimentary consultations",
      es: "Paquetes especiales y consultas complementarias",
    },
    image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80",
    icon: "Gift",
  },
];

export const services: Service[] = [
  // === WASH ===
  {
    id: "svc-wash-normal",
    categoryId: "cat-wash",
    name: { en: "Normal Wash", es: "Lavado Normal" },
    description: {
      en: "Professional hair wash with quality shampoo and conditioner",
      es: "Lavado profesional de cabello con shampoo y acondicionador de calidad",
    },
    durationMinutes: 20,
    price: 10,
    lucideIcon: "Droplets",
  },
  {
    id: "svc-wash-special",
    categoryId: "cat-wash",
    name: { en: "Special Wash", es: "Lavado Especial" },
    description: {
      en: "Premium wash with specialized products and scalp massage",
      es: "Lavado premium con productos especializados y masaje capilar",
    },
    durationMinutes: 30,
    price: 15,
    lucideIcon: "Droplets",
  },
  {
    id: "svc-wash-men",
    categoryId: "cat-wash",
    name: { en: "Men's Wash", es: "Lavado Caballero" },
    description: {
      en: "Quick professional wash for men",
      es: "Lavado profesional rápido para caballeros",
    },
    durationMinutes: 15,
    price: 5,
    lucideIcon: "Droplets",
  },

  // === TREATMENTS ===
  {
    id: "svc-treatment-repair",
    categoryId: "cat-treatment",
    name: { en: "Repair Treatment", es: "Tratamiento Reparador" },
    description: {
      en: "Intensive repair treatment to restore damaged and brittle hair",
      es: "Tratamiento intensivo de reparación para restaurar cabello dañado y quebradizo",
    },
    durationMinutes: 60,
    price: 55,
    lucideIcon: "Sparkles",
  },
  {
    id: "svc-treatment-hydrate",
    categoryId: "cat-treatment",
    name: { en: "Deep Hydration Treatment", es: "Tratamiento Hidratante Profundo" },
    description: {
      en: "Deep hydration therapy for dry hair using premium botanical masks",
      es: "Terapia de hidratación profunda para cabello seco con máscaras botánicas premium",
    },
    durationMinutes: 75,
    price: 75,
    lucideIcon: "Droplets",
  },
  {
    id: "svc-treatment-postcolor",
    categoryId: "cat-treatment",
    name: { en: "Post-Color Treatment", es: "Tratamiento Post Color" },
    description: {
      en: "Specialized post-color treatment to seal, protect, and extend color vibrancy",
      es: "Tratamiento especializado post coloración para sellar, proteger y prolongar la vibración del color",
    },
    durationMinutes: 60,
    price: 75,
    lucideIcon: "Zap",
  },
  {
    id: "svc-scalp-massage",
    categoryId: "cat-treatment",
    name: { en: "Scalp Massage", es: "Masaje Capilar" },
    description: {
      en: "Relaxing scalp massage to improve circulation and promote hair health",
      es: "Masaje capilar relajante para mejorar la circulación y promover la salud del cabello",
    },
    durationMinutes: 20,
    price: 10,
    lucideIcon: "Heart",
  },

  // === BLOWER / HAIRSTYLES ===
  {
    id: "svc-blower",
    categoryId: "cat-blowout",
    name: { en: "Blowout", es: "Blower" },
    description: {
      en: "Professional blow-dry with volume and movement",
      es: "Secado profesional con volumen y movimiento",
    },
    durationMinutes: 45,
    price: 25,
    priceMax: 35,
    lucideIcon: "Wind",
  },
  {
    id: "svc-blower-style",
    categoryId: "cat-blowout",
    name: { en: "Blower Style", es: "Blower Style" },
    description: {
      en: "Styled blow-dry with custom finishing and lasting hold",
      es: "Secado estilizado con acabado personalizado y fijación duradera",
    },
    durationMinutes: 50,
    price: 40,
    lucideIcon: "Wind",
  },
  {
    id: "svc-waves-beach",
    categoryId: "cat-blowout",
    name: { en: "Waves / Beach Waves", es: "Ondas / Waves Beach" },
    description: {
      en: "Effortless beachy waves for a relaxed, natural look",
      es: "Ondas playeras sin esfuerzo para un look relajado y natural",
    },
    durationMinutes: 45,
    price: 35,
    lucideIcon: "Waves",
  },

  // === UPDOS ===
  {
    id: "svc-half-updo",
    categoryId: "cat-updo",
    name: { en: "Half Updo", es: "Semi Recogido" },
    description: {
      en: "Elegant half-up half-down style for a sophisticated look",
      es: "Elegante estilo semi recogido para un look sofisticado",
    },
    durationMinutes: 45,
    price: 50,
    lucideIcon: "Crown",
  },
  {
    id: "svc-social-updo",
    categoryId: "cat-updo",
    name: { en: "Social Updo", es: "Peinado Social" },
    description: {
      en: "Formal updo for galas, parties, and social events",
      es: "Recogido formal para galas, fiestas y eventos sociales",
    },
    durationMinutes: 60,
    price: 60,
    lucideIcon: "Crown",
  },
  {
    id: "svc-bridal-updo",
    categoryId: "cat-updo",
    name: { en: "Bridal Updo", es: "Peinado de Novia" },
    description: {
      en: "Luxurious bridal hairstyle with trial consultation included",
      es: "Peinado de novia de lujo con prueba de consulta incluida",
    },
    durationMinutes: 120,
    price: 150,
    priceMax: 200,
    lucideIcon: "Crown",
  },

  // === MAKEUP ===
  {
    id: "svc-makeup-social",
    categoryId: "cat-makeup",
    name: { en: "Social Makeup", es: "Maquillaje Social" },
    description: {
      en: "Professional makeup for social events with premium products",
      es: "Maquillaje profesional para eventos sociales con productos premium",
    },
    durationMinutes: 60,
    price: 120,
    lucideIcon: "Palette",
  },
  {
    id: "svc-makeup-waterproof",
    categoryId: "cat-makeup",
    name: { en: "Waterproof Makeup", es: "Maquillaje Waterproof" },
    description: {
      en: "Long-lasting waterproof makeup for all-day events",
      es: "Maquillaje resistente al agua de larga duración para eventos de todo el día",
    },
    durationMinutes: 75,
    price: 150,
    lucideIcon: "Palette",
  },
  {
    id: "svc-makeup-bride",
    categoryId: "cat-makeup",
    name: { en: "Bridal Makeup", es: "Maquillaje de Novia" },
    description: {
      en: "Complete bridal makeup experience with trial, premium products, and touch-up kit",
      es: "Experiencia completa de maquillaje nupcial con prueba, productos premium y kit de retoque",
    },
    durationMinutes: 120,
    price: 600,
    lucideIcon: "Palette",
  },

  // === COLOR & BALAYAGE ===
  {
    id: "svc-color-root",
    categoryId: "cat-color",
    name: { en: "Root Color", es: "Color Raíz" },
    description: {
      en: "Root touch-up color application with premium ammonia-free dyes",
      es: "Aplicación de color en raíz con tintes premium sin amoníaco",
    },
    durationMinutes: 90,
    price: 75,
    lucideIcon: "Paintbrush",
  },
  {
    id: "svc-color-tint",
    categoryId: "cat-color",
    name: { en: "Color Tint", es: "Color Matiz" },
    description: {
      en: "Semi-permanent tint to refresh and enhance your natural color",
      es: "Matiz semipermanente para refrescar y realzar tu color natural",
    },
    durationMinutes: 60,
    price: 50,
    lucideIcon: "Paintbrush",
  },
  {
    id: "svc-color-reverse",
    categoryId: "cat-color",
    name: { en: "Color Reverse", es: "Color Reverse" },
    description: {
      en: "Color correction and reversal technique for a fresh new look",
      es: "Técnica de corrección y reversión de color para un look fresco",
    },
    durationMinutes: 150,
    price: 150,
    priceMax: 180,
    lucideIcon: "Paintbrush",
    note: {
      en: "Designs are subject to evaluation; price may vary within the stated range",
      es: "Los diseños están sujetos a evaluación; el precio puede variar dentro del rango expuesto",
    },
  },
  {
    id: "svc-color-design",
    categoryId: "cat-color",
    name: { en: "Color Design", es: "Diseño de Color" },
    description: {
      en: "Creative custom color design tailored to your unique style",
      es: "Diseño de color creativo personalizado según tu estilo único",
    },
    durationMinutes: 180,
    price: 150,
    priceMax: 250,
    lucideIcon: "Paintbrush",
    note: {
      en: "Designs are subject to evaluation; price may vary within the stated range",
      es: "Los diseños están sujetos a evaluación; el precio puede variar dentro del rango expuesto",
    },
  },
  {
    id: "svc-balayage",
    categoryId: "cat-color",
    name: { en: "Highlights / Balayage", es: "Highlights / Balayage" },
    description: {
      en: "Hand-painted balayage highlights for a natural, sun-kissed gradient effect",
      es: "Mechas balayage pintadas a mano para un efecto degradado natural y luminoso",
    },
    durationMinutes: 180,
    price: 250,
    lucideIcon: "Sun",
    note: {
      en: "Designs are subject to evaluation; price may vary within the stated range",
      es: "Los diseños están sujetos a evaluación; el precio puede variar dentro del rango expuesto",
    },
  },

  // === CUTS ===
  {
    id: "svc-cut-style",
    categoryId: "cat-cuts",
    name: { en: "Style Cut (Pixie/Shaggy/Bob/Long Bob)", es: "Corte con Estilo (Pixie/Shaggy/Bob/Long Bob)" },
    description: {
      en: "Precision cut with trendy styles — pixie, shaggy, bob, or long bob",
      es: "Corte de precisión con estilos tendencia — pixie, shaggy, bob o long bob",
    },
    durationMinutes: 60,
    price: 85,
    lucideIcon: "Scissors",
    note: {
      en: "Cut services do not include blowout",
      es: "Los servicios de corte no incluyen blower",
    },
  },
  {
    id: "svc-cut-texture",
    categoryId: "cat-cuts",
    name: { en: "Texture Cut", es: "Corte Texture" },
    description: {
      en: "Textured layering cut for natural movement and volume",
      es: "Corte texturizado en capas para movimiento y volumen natural",
    },
    durationMinutes: 60,
    price: 80,
    lucideIcon: "Scissors",
    note: {
      en: "Cut services do not include blowout",
      es: "Los servicios de corte no incluyen blower",
    },
  },
  {
    id: "svc-cut-butterfly",
    categoryId: "cat-cuts",
    name: { en: "Butterfly Cut", es: "Corte Butterfly" },
    description: {
      en: "Trending butterfly cut with soft, face-framing layers",
      es: "Corte butterfly tendencia con capas suaves que enmarcan el rostro",
    },
    durationMinutes: 60,
    price: 80,
    lucideIcon: "Scissors",
    note: {
      en: "Cut services do not include blowout",
      es: "Los servicios de corte no incluyen blower",
    },
  },
  {
    id: "svc-cut-men",
    categoryId: "cat-cuts",
    name: { en: "Men's Haircut", es: "Corte Caballero" },
    description: {
      en: "Classic or modern men's haircut with clean lines and styling",
      es: "Corte de caballero clásico o moderno con líneas limpias y estilizado",
    },
    durationMinutes: 30,
    price: 30,
    lucideIcon: "Scissors",
  },
  {
    id: "svc-beard",
    categoryId: "cat-cuts",
    name: { en: "Beard Trim", es: "Barba" },
    description: {
      en: "Professional beard shaping and trim",
      es: "Perfilado y recorte profesional de barba",
    },
    durationMinutes: 20,
    price: 15,
    lucideIcon: "Scissors",
  },
  {
    id: "svc-eyebrows",
    categoryId: "cat-cuts",
    name: { en: "Eyebrow Threading", es: "Cejas con Hilo" },
    description: {
      en: "Precision eyebrow shaping with threading technique",
      es: "Diseño de cejas con precisión usando técnica de hilo",
    },
    durationMinutes: 15,
    price: 15,
    lucideIcon: "Eye",
  },

  // === VIP MASTERCLASS ===
  {
    id: "svc-curso-vip",
    categoryId: "cat-vip",
    name: { en: "VIP Masterclass", es: "Curso VIP" },
    description: {
      en: "Exclusive 1-on-1 masterclass with our top specialists. Learn professional techniques in color, styling, or treatments tailored to your goals.",
      es: "Masterclass exclusiva 1 a 1 con nuestras mejores especialistas. Aprende técnicas profesionales en color, estilismo o tratamientos adaptadas a tus metas.",
    },
    durationMinutes: 180,
    price: 200,
    priceMax: 1300,
    lucideIcon: "GraduationCap",
  },

  // === PACKAGES ===
  {
    id: "svc-bride-package",
    categoryId: "cat-packages",
    name: { en: "Bride Package", es: "Paquete Novia" },
    description: {
      en: "Complete bridal experience including updo, makeup, trial session, and day-of touch-ups for your perfect day.",
      es: "Experiencia nupcial completa que incluye peinado, maquillaje, sesión de prueba y retoques el día del evento para tu día perfecto.",
    },
    durationMinutes: 300,
    price: 600,
    lucideIcon: "Heart",
  },
  {
    id: "svc-free-evaluation",
    categoryId: "cat-packages",
    name: { en: "Free Initial Evaluation", es: "Primera Evaluación Gratuita" },
    description: {
      en: "Complimentary consultation to assess your hair needs and recommend the best services and treatments for you.",
      es: "Consulta gratuita para evaluar las necesidades de tu cabello y recomendar los mejores servicios y tratamientos para ti.",
    },
    durationMinutes: 30,
    price: 0,
    lucideIcon: "MessageCircle",
  },
];
