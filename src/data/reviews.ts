import type { Review } from "@/types/review";

export const reviews: Review[] = [
  {
    id: "rev-001",
    bookingId: "booking-demo-001",
    clientId: "user-sofia",
    clientName: "Sofia Chen",
    stylistId: "stylist-camila",
    serviceId: "svc-hair-highlights",
    rating: 5,
    comment:
      "Camila did an absolutely stunning balayage on my dark hair. The color transition looks so natural, and she took the time to explain how to maintain it at home. I have never felt more confident with my hair!",
    createdAt: "2025-12-15T14:30:00Z",
  },
  {
    id: "rev-002",
    bookingId: "booking-demo-002",
    clientId: "user-sofia",
    clientName: "Sofia Chen",
    stylistId: "stylist-valentina",
    serviceId: "svc-nails-art",
    rating: 5,
    comment:
      "Valentina is a true artist! I asked for a floral design and she turned my nails into tiny masterpieces. The gel lasted three weeks without a single chip. Already booked my next appointment.",
    createdAt: "2026-01-03T11:00:00Z",
  },
  {
    id: "rev-003",
    bookingId: "booking-demo-003",
    clientId: "user-guest-001",
    clientName: "Elena Rodriguez",
    stylistId: "stylist-lucia",
    serviceId: "svc-skin-facial",
    rating: 4,
    comment:
      "Great facial experience overall. Lucia was very knowledgeable about my skin type and recommended a routine that has already improved my complexion. The only reason for 4 stars is the wait time was a bit longer than expected.",
    createdAt: "2026-01-10T16:45:00Z",
  },
  {
    id: "rev-004",
    bookingId: "booking-demo-004",
    clientId: "user-guest-002",
    clientName: "Ana Morales",
    stylistId: "stylist-mariana",
    serviceId: "svc-makeup-bridal",
    rating: 5,
    comment:
      "Mariana made me feel like a princess on my wedding day. The trial session was thorough and she listened to every detail I wanted. My makeup lasted all day and night through tears of joy and dancing. Absolutely worth every penny!",
    createdAt: "2026-01-22T09:15:00Z",
  },
  {
    id: "rev-005",
    bookingId: "booking-demo-005",
    clientId: "user-guest-003",
    clientName: "Daniela Vargas",
    stylistId: "stylist-camila",
    serviceId: "svc-hair-treatment",
    rating: 4,
    comment:
      "The keratin treatment transformed my frizzy hair into smooth, manageable locks. Camila was professional and explained the aftercare in detail. My hair has never looked this healthy. Will definitely come back!",
    createdAt: "2026-02-01T13:00:00Z",
  },
  {
    id: "rev-006",
    bookingId: "booking-demo-006",
    clientId: "user-guest-004",
    clientName: "Carolina Jimenez",
    stylistId: "stylist-lucia",
    serviceId: "svc-skin-hydra",
    rating: 5,
    comment:
      "The HydraGlow treatment was an incredible experience. My skin was literally glowing when I left. Lucia is so gentle and thorough. The LED therapy combined with the oxygen infusion made my skin feel brand new. Highly recommend!",
    createdAt: "2026-02-08T10:30:00Z",
  },
];
