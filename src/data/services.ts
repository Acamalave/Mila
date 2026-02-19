import type { ServiceCategory, Service } from "@/types/service";

export const serviceCategories: ServiceCategory[] = [
  {
    id: "cat-hair",
    name: { en: "Hair", es: "Cabello" },
    description: {
      en: "Cuts, coloring, treatments, and styling for every hair type",
      es: "Cortes, coloraci\u00f3n, tratamientos y peinados para todo tipo de cabello",
    },
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    icon: "Scissors",
  },
];

export const services: Service[] = [
  {
    id: "svc-hair-cut",
    categoryId: "cat-hair",
    name: { en: "Haircut & Style", es: "Corte y Peinado" },
    description: {
      en: "Precision haircut with wash, blow-dry, and finishing style tailored to your face shape",
      es: "Corte de precisi\u00f3n con lavado, secado y peinado final adaptado a la forma de tu rostro",
    },
    durationMinutes: 60,
    price: 65,
    lucideIcon: "Scissors",
  },
  {
    id: "svc-hair-color",
    categoryId: "cat-hair",
    name: { en: "Full Color", es: "Coloraci\u00f3n Completa" },
    description: {
      en: "Complete single-process color application with premium ammonia-free dyes",
      es: "Aplicaci\u00f3n completa de color en un solo proceso con tintes premium sin amon\u00edaco",
    },
    durationMinutes: 120,
    price: 150,
    lucideIcon: "Paintbrush",
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
  },
  {
    id: "svc-hair-blowout",
    categoryId: "cat-hair",
    name: { en: "Luxury Blowout", es: "Brushing de Lujo" },
    description: {
      en: "Professional blowout with volume, movement, and lasting hold using luxury products",
      es: "Brushing profesional con volumen, movimiento y fijaci\u00f3n duradera usando productos de lujo",
    },
    durationMinutes: 45,
    price: 55,
    lucideIcon: "Wind",
  },
  {
    id: "svc-hair-extensions",
    categoryId: "cat-hair",
    name: { en: "Hair Extensions", es: "Extensiones de Cabello" },
    description: {
      en: "Premium tape-in or micro-link extensions for natural-looking length and volume",
      es: "Extensiones premium de cinta o micro-link para largo y volumen de aspecto natural",
    },
    durationMinutes: 180,
    price: 400,
    lucideIcon: "Layers",
  },
  {
    id: "svc-hair-deepcond",
    categoryId: "cat-hair",
    name: { en: "Deep Conditioning", es: "Acondicionamiento Profundo" },
    description: {
      en: "Intensive moisture treatment to restore dry, damaged hair with premium botanical masks",
      es: "Tratamiento intensivo de hidrataci\u00f3n para restaurar cabello seco y da\u00f1ado con m\u00e1scaras bot\u00e1nicas premium",
    },
    durationMinutes: 45,
    price: 75,
    lucideIcon: "Droplets",
  },
  {
    id: "svc-hair-olaplex",
    categoryId: "cat-hair",
    name: { en: "Olaplex Treatment", es: "Tratamiento Olaplex" },
    description: {
      en: "Bond-building Olaplex treatment to repair and strengthen chemically treated hair",
      es: "Tratamiento Olaplex de reconstrucci\u00f3n de enlaces para reparar y fortalecer cabello tratado qu\u00edmicamente",
    },
    durationMinutes: 60,
    price: 120,
    lucideIcon: "Zap",
  },
  {
    id: "svc-hair-toner",
    categoryId: "cat-hair",
    name: { en: "Gloss & Toner", es: "Gloss y T\u00f3ner" },
    description: {
      en: "Semi-permanent gloss or toner to refresh color, add shine, and correct tone",
      es: "Gloss o t\u00f3ner semipermanente para refrescar color, a\u00f1adir brillo y corregir tono",
    },
    durationMinutes: 45,
    price: 85,
    lucideIcon: "Palette",
  },
  {
    id: "svc-hair-scalp",
    categoryId: "cat-hair",
    name: { en: "Scalp Treatment", es: "Tratamiento Capilar" },
    description: {
      en: "Therapeutic scalp treatment with exfoliation, massage, and nourishing serums",
      es: "Tratamiento terap\u00e9utico del cuero cabelludo con exfoliaci\u00f3n, masaje y s\u00e9rums nutritivos",
    },
    durationMinutes: 30,
    price: 50,
    lucideIcon: "Heart",
  },
];
