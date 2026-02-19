"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  loginByPhone: (phone: string, countryCode: string) => void;
  register: (name: string, phone: string, countryCode: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USERS: Record<string, { name: string; role: "admin" | "client"; id: string }> = {
  "5551002000": { name: "Isabella Martinez", role: "admin", id: "user-admin" },
  "5553004000": { name: "Sofia Chen", role: "client", id: "user-sofia" },
};

function createUserFromPhone(phone: string, countryCode: string): User {
  const mock = MOCK_USERS[phone];
  return {
    id: mock?.id ?? generateId(),
    name: mock?.name ?? `User ${phone.slice(-4)}`,
    phone,
    countryCode,
    role: mock?.role ?? "client",
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredData<User | null>("mila-auth", null);
    if (stored) setUser(stored);
    setHydrated(true);
  }, []);

  const loginByPhone = useCallback((phone: string, countryCode: string) => {
    const newUser = createUserFromPhone(phone, countryCode);
    setUser(newUser);
    setStoredData("mila-auth", newUser);
  }, []);

  const register = useCallback((name: string, phone: string, countryCode: string) => {
    const newUser: User = {
      id: generateId(),
      name,
      phone,
      countryCode,
      role: "client",
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setStoredData("mila-auth", newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStoredData("mila-auth", null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, hydrated, loginByPhone, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
