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
  lucideIcon: string;
  image?: string;
}
