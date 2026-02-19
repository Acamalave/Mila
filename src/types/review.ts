export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  stylistId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
