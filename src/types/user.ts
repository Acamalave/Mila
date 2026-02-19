export type UserRole = "client" | "admin" | "stylist";

export interface User {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
