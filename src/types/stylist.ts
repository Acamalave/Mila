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

export type StaffSystemRole = "admin" | "stylist" | "accountant";

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
  /** Optional commission % paid on retail product sales attributed to this
   *  stylist. Falls back to `defaultCommission` when unset. */
  productCommission?: number;
  serviceCommissions?: ServiceCommission[];
  linkedUserId?: string;
  linkedPhone?: string;
  /** System access role: "admin" gets full admin panel, "stylist" gets stylist dashboard */
  systemRole?: StaffSystemRole;
  /** Whether this person appears publicly on the booking page as a specialist */
  isPublic?: boolean;
  /** Specific dates the stylist is unavailable (vacation, time off, etc.).
   * Format: "YYYY-MM-DD". Booking flow must skip these dates. */
  blockedDates?: string[];
}
