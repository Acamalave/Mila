import type { User } from "@/types/user";

export const users: User[] = [
  {
    id: "user-isabella",
    name: "Isabella Martinez",
    phone: "5551002000",
    countryCode: "+1",
    email: "admin@mila.com",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80",
    role: "admin",
    createdAt: "2024-06-01T08:00:00Z",
  },
  {
    id: "user-sofia",
    name: "Sofia Chen",
    phone: "5553004000",
    countryCode: "+1",
    email: "client@mila.com",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80",
    role: "client",
    createdAt: "2025-03-15T10:30:00Z",
  },
];
