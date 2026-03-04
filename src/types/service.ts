export interface ServiceCategory {
  id: string;
  name: { en: string; es: string };
  description: { en: string; es: string };
  image: string;
  icon: string;
}

export interface Service {
  id: string;
  categoryId: string;
  name: { en: string; es: string };
  description: { en: string; es: string };
  durationMinutes: number;
  price: number;
  priceMax?: number; // For range prices like $25-$35
  lucideIcon: string;
  image?: string;
  note?: { en: string; es: string }; // Special notes like "price subject to evaluation"
}
