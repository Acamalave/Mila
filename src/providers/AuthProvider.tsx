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
import { stylists as seedStylists } from "@/data/stylists";
import { setDocument } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  loginByPhone: (phone: string, countryCode: string, name?: string) => void;
  register: (name: string, phone: string, countryCode: string) => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "phone" | "email">>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USERS: Record<string, { name: string; role: "admin" | "client" | "stylist"; id: string }> = {
  "5551002000": { name: "Isabella Martinez", role: "admin", id: "user-admin" },
  "5552003000": { name: "Camila Reyes", role: "stylist", id: "user-camila" },
  "5553004000": { name: "Sofia Chen", role: "client", id: "user-sofia" },
};

/* ── User registry: localStorage + Firestore sync ── */
function addToUserRegistry(user: User): void {
  if (!user.id || !user.phone) return;
  const raw = getStoredData<User[]>("mila-users", []);
  // Deduplicate by phone (primary key for real users)
  const byPhone = new Map<string, User>();
  for (const u of raw) {
    if (!u.phone) continue;
    // Keep the most complete entry
    const existing = byPhone.get(u.phone);
    if (!existing || (u.createdAt && !existing.createdAt)) {
      byPhone.set(u.phone, u);
    }
  }
  // Upsert current user
  const existing = byPhone.get(user.phone);
  if (existing) {
    byPhone.set(user.phone, { ...existing, ...user });
  } else {
    byPhone.set(user.phone, user);
  }
  setStoredData("mila-users", Array.from(byPhone.values()));

  // Sync to Firestore
  const { id, ...userData } = user;
  setDocument("users", id, { ...userData, phone: user.phone }).catch((err) => {
    console.warn("[Mila] Failed to sync user to Firestore:", err);
  });
}

function seedMockUsersToRegistry(): void {
  const registry = getStoredData<User[]>("mila-users", []);
  let changed = false;
  for (const [phone, mock] of Object.entries(MOCK_USERS)) {
    if (!registry.some((u) => u.phone === phone)) {
      const mockUser: User = {
        id: mock.id,
        name: mock.name,
        phone,
        countryCode: "+507",
        role: mock.role,
        createdAt: new Date().toISOString(),
      };
      registry.push(mockUser);
      changed = true;
      // Sync mock user to Firestore
      const { id, ...data } = mockUser;
      setDocument("users", id, data).catch(() => {});
    }
  }
  if (changed) setStoredData("mila-users", registry);
}

function createUserFromPhone(phone: string, countryCode: string, providedName?: string): User {
  const mock = MOCK_USERS[phone];
  if (mock) {
    return {
      id: mock.id,
      name: mock.name,
      phone,
      countryCode,
      role: mock.role,
      createdAt: new Date().toISOString(),
    };
  }

  // Check if user already exists in registry (preserve their id)
  const registry = getStoredData<User[]>("mila-users", []);
  const existingUser = registry.find((u) => u.phone === phone);

  const allStaffCustom = getStoredData<Array<{ linkedPhone?: string; name: string }>>("mila-staff-custom", []);
  const linkedStylist =
    seedStylists.find((s) => s.linkedPhone === phone) ||
    allStaffCustom.find((s) => s.linkedPhone === phone);

  // Deterministic ID based on phone to ensure consistency across devices
  const determinedId = existingUser?.id || `user-${phone}`;

  if (linkedStylist) {
    return {
      id: determinedId,
      name: linkedStylist.name,
      phone,
      countryCode,
      role: "stylist",
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };
  }

  return {
    id: determinedId,
    name: existingUser?.name || providedName || `User ${phone.slice(-4)}`,
    phone,
    countryCode,
    role: existingUser?.role || "client",
    createdAt: existingUser?.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredData<User | null>("mila-auth", null);
    if (stored) {
      setUser(stored);
      addToUserRegistry(stored);
    }
    seedMockUsersToRegistry();
    setHydrated(true);
  }, []);

  const loginByPhone = useCallback((phone: string, countryCode: string, name?: string) => {
    const newUser = createUserFromPhone(phone, countryCode, name);
    setUser(newUser);
    setStoredData("mila-auth", newUser);
    addToUserRegistry(newUser);
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
    addToUserRegistry(newUser);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<User, "name" | "phone" | "email">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated: User = { ...prev, ...updates };
        setStoredData("mila-auth", updated);
        addToUserRegistry(updated);
        return updated;
      });
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setStoredData("mila-auth", null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, hydrated, loginByPhone, register, updateProfile, logout }}
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
