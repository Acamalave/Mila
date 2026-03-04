export interface StylistSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ServiceCommission {
  serviceId: string;
  percentage: number;
}

export interface Stylist {
  id: string;
  name: string;
  role: { en: string; es: string };
  bio: { en: string; es: string };
  avatar: string;
  specialties: string[];
  serviceIds: string[];
  rating: number;
  reviewCount: number;
  schedule: StylistSchedule[];
  instagram?: string;
  defaultCommission: number;
  serviceCommissions?: ServiceCommission[];
  linkedUserId?: string;
  linkedPhone?: string;
}
