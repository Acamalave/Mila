export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  serviceIds: string[];
  stylistId: string;
  clientId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
  notes?: string;
  guestName?: string;
  guestPhone?: string;
  createdAt: string;
}

export interface BookingFlowState {
  step: 1 | 2 | 3 | 4;
  selectedStylistId: string | null;
  selectedServiceIds: string[];
  isGeneralAppointment: boolean;
  selectedDate: string | null;
  selectedTimeSlot: TimeSlot | null;
  notes: string;
}
