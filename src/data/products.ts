import type { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: "prod-shampoo-repair",
    name: "Restore & Repair Shampoo",
    brand: "Mila Essentials",
    description: {
      en: "Sulfate-free shampoo infused with argan oil and keratin to repair damaged hair and restore natural shine",
      es: "Champ\u00fa sin sulfatos enriquecido con aceite de arg\u00e1n y keratina para reparar el cabello da\u00f1ado y restaurar el brillo natural",
    },
    price: 28,
    image:
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80",
    category: "hair-care",
    inStock: true,
    stockQuantity: 45,
    rating: 4.6,
    featured: true,
  },
  {
    id: "prod-conditioner-hydra",
    name: "Deep Hydration Conditioner",
    brand: "Mila Essentials",
    description: {
      en: "Intensive moisturizing conditioner with shea butter and vitamin E for silky-smooth, frizz-free hair",
      es: "Acondicionador de hidrataci\u00f3n intensiva con manteca de karit\u00e9 y vitamina E para un cabello suave y sin frizz",
    },
    price: 32,
    image:
      "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80",
    category: "hair-care",
    inStock: true,
    stockQuantity: 38,
    rating: 4.5,
    featured: false,
  },
  {
    id: "prod-hair-oil",
    name: "Luminous Hair Oil",
    brand: "Mila Luxe",
    description: {
      en: "Lightweight finishing oil with jojoba and camellia to add brilliant shine without weighing hair down",
      es: "Aceite ligero de acabado con jojoba y camelia que aporta un brillo espectacular sin apelmazar el cabello",
    },
    price: 42,
    image:
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80",
    category: "hair-care",
    inStock: true,
    stockQuantity: 22,
    rating: 4.8,
    featured: true,
  },
  {
    id: "prod-face-serum",
    name: "Vitamin C Brightening Serum",
    brand: "Mila Skin Lab",
    description: {
      en: "Potent 20% vitamin C serum with hyaluronic acid to brighten, firm, and protect against environmental damage",
      es: "S\u00e9rum potente con 20% de vitamina C y \u00e1cido hialur\u00f3nico para iluminar, reafirmar y proteger contra el da\u00f1o ambiental",
    },
    price: 58,
    image:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    category: "skin-care",
    inStock: true,
    stockQuantity: 30,
    rating: 4.9,
    featured: true,
  },
  {
    id: "prod-moisturizer",
    name: "Hydra-Barrier Moisturizer",
    brand: "Mila Skin Lab",
    description: {
      en: "Rich yet fast-absorbing moisturizer with ceramides and niacinamide to strengthen the skin barrier",
      es: "Crema hidratante rica pero de r\u00e1pida absorci\u00f3n con ceramidas y niacinamida para fortalecer la barrera cut\u00e1nea",
    },
    price: 46,
    image:
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80",
    category: "skin-care",
    inStock: true,
    stockQuantity: 25,
    rating: 4.7,
    featured: false,
  },
  {
    id: "prod-heat-spray",
    name: "Thermal Shield Spray",
    brand: "Mila Styling",
    description: {
      en: "Heat protection spray up to 450\u00b0F with added UV filters and anti-breakage technology",
      es: "Spray de protecci\u00f3n t\u00e9rmica hasta 230\u00b0C con filtros UV y tecnolog\u00eda anti-rotura",
    },
    price: 24,
    image:
      "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=800&q=80",
    category: "styling",
    inStock: true,
    stockQuantity: 52,
    rating: 4.4,
    featured: false,
  },
  {
    id: "prod-texturizing-paste",
    name: "Matte Texturizing Paste",
    brand: "Mila Styling",
    description: {
      en: "Medium-hold matte paste for textured, lived-in styles with a natural, non-greasy finish",
      es: "Pasta texturizante de fijaci\u00f3n media con acabado mate natural y sin residuos grasos",
    },
    price: 22,
    image:
      "https://images.unsplash.com/photo-1597354984706-fac992d9306f?w=800&q=80",
    category: "styling",
    inStock: true,
    stockQuantity: 40,
    rating: 4.3,
    featured: false,
  },
  {
    id: "prod-dryer-pro",
    name: "Ionic Pro Hair Dryer",
    brand: "Mila Tools",
    description: {
      en: "Professional-grade ionic hair dryer with 3 heat settings, cool shot button, and concentrator nozzle for salon results at home",
      es: "Secador de pelo i\u00f3nico de grado profesional con 3 ajustes de calor, bot\u00f3n de aire fr\u00edo y boquilla concentradora para resultados de sal\u00f3n en casa",
    },
    price: 120,
    image:
      "https://images.unsplash.com/photo-1522338140-7f67603f3283?w=800&q=80",
    category: "tools",
    inStock: true,
    stockQuantity: 12,
    rating: 4.7,
    featured: true,
  },
];
