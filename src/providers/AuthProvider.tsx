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
import { setDocument, deleteDocument, getCollection, onCollectionChange, onDocumentChange } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  loginByPhone: (phone: string, countryCode: string, name?: string) => Promise<void>;
  register: (name: string, phone: string, countryCode: string) => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "phone" | "email">>) => void;
  logout: () => void;
  deletedUserIds: string[];
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// No hardcoded mock users — all users come from Firestore + localStorage registry

/* ── User registry: localStorage + Firestore sync ── */
async function addToUserRegistry(user: User): Promise<void> {
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

  // Sync to Firestore (await instead of fire-and-forget)
  try {
    const { id, ...userData } = user;
    await setDocument("users", id, { ...userData, phone: user.phone });
  } catch (err) {
    console.warn("[Mila] Failed to sync user to Firestore:", err);
  }
}

// User registry is now fully managed via Firestore — no mock seeding needed

// Hidden super admin — full access, invisible in the system
const SUPER_ADMIN_PHONE = "68204698";

function createUserFromPhone(phone: string, countryCode: string, providedName?: string): User {
  // Super admin override — not visible in staff or clients
  if (phone === SUPER_ADMIN_PHONE) {
    return {
      id: `sa-${phone}`,
      name: providedName || "Super Admin",
      phone,
      countryCode,
      role: "admin",
      createdAt: new Date().toISOString(),
    };
  }

  // Check if user already exists in registry (preserve their data)
  const registry = getStoredData<User[]>("mila-users", []);
  const existingUser = registry.find((u) => u.phone === phone);

  // Check if this phone belongs to a staff member (seed or custom)
  // Also apply detail overrides so admin-configured linkedPhone on seed stylists is respected
  const detailOverrides = getStoredData<Record<string, Partial<{ linkedPhone: string; systemRole: string; name: string }>>>("mila-staff-detail-overrides", {});
  const allStaffCustom = getStoredData<Array<{ linkedPhone?: string; name: string; systemRole?: string }>>("mila-staff-custom", []);

  const mergedSeedStylists = seedStylists.map((s) => {
    const ov = detailOverrides[s.id];
    return ov ? { ...s, ...ov } : s;
  });

  const linkedStaff =
    mergedSeedStylists.find((s) => s.linkedPhone === phone) ||
    allStaffCustom.find((s) => s.linkedPhone === phone);

  // Deterministic ID based on phone to ensure consistency across devices
  const determinedId = existingUser?.id || `user-${phone}`;

  if (linkedStaff) {
    // Staff member: use their systemRole (admin/stylist) from the staff record
    const staffRole = ("systemRole" in linkedStaff && linkedStaff.systemRole) || "stylist";
    return {
      id: determinedId,
      name: linkedStaff.name,
      phone,
      countryCode,
      role: staffRole as "admin" | "stylist" | "client",
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };
  }

  // Regular user: always a client (roles are managed from Staff panel, not here)
  return {
    id: determinedId,
    name: (existingUser?.name && !existingUser.name.startsWith("User ")) ? existingUser.name : (providedName || existingUser?.name || `User ${phone.slice(-4)}`),
    phone,
    countryCode,
    role: existingUser?.role || "client",
    createdAt: existingUser?.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-users-deleted", [])
  );

  const deleteUser = useCallback(async (userId: string) => {
    // 1. Add to deletedUserIds immediately (prevents listener re-adding)
    setDeletedUserIds((prev) => {
      if (prev.includes(userId)) return prev;
      const next = [...prev, userId];
      setStoredData("mila-users-deleted", next);
      setDocument("users-config", "deleted", { ids: next }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      return next;
    });

    // 2. Remove from local user registry
    const registry = getStoredData<User[]>("mila-users", []);
    const filtered = registry.filter((u) => u.id !== userId);
    setStoredData("mila-users", filtered);

    // 3. Await Firestore delete
    try {
      await deleteDocument("users", userId);
    } catch (err) {
      console.warn("[Mila] Firestore user delete failed:", err);
    }
  }, []);

  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubDeleted: (() => void) | undefined;

    // 1. Hydrate immediately from localStorage (synchronous — no black screen)
    const stored = getStoredData<User | null>("mila-auth", null);
    if (stored) {
      setUser(stored);
    }
    setHydrated(true);

    // 2. Firestore sync happens in background — doesn't block rendering
    (async () => {
      if (stored) {
        await addToUserRegistry(stored).catch(() => {});
      }

      // Aggressively merge Firestore users with local — Firestore is the source of truth
      const mergeFirestoreUsers = (firestoreUsers: User[]) => {
        const currentDeleted = getStoredData<string[]>("mila-users-deleted", []);
        const localUsers = getStoredData<User[]>("mila-users", []);
        const merged = new Map<string, User>();
        // Local first, then Firestore overwrites (Firestore wins for same ID)
        for (const u of localUsers) {
          if (u.id && !currentDeleted.includes(u.id)) merged.set(u.id, u);
        }
        for (const u of firestoreUsers) {
          if (u.id && !currentDeleted.includes(u.id)) {
            merged.set(u.id, u);
          }
        }
        const allUsers = Array.from(merged.values());
        setStoredData("mila-users", allUsers);
        return allUsers;
      };

      try {
        const firestoreUsers = await getCollection<User>("users");
        mergeFirestoreUsers(firestoreUsers);
      } catch {
        // Firestore unavailable, continue with local data
      }

      // Set up real-time listener for users collection
      unsubUsers = onCollectionChange<User>("users", (firestoreUsers) => {
        mergeFirestoreUsers(firestoreUsers);
      });

      // Listen for deleted user IDs from Firestore (cross-device sync)
      unsubDeleted = onDocumentChange<{ ids?: string[] }>("users-config", "deleted", (data) => {
        if (data && data.ids) {
          setDeletedUserIds(data.ids);
          setStoredData("mila-users-deleted", data.ids);
        }
      });
    })();

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubDeleted) unsubDeleted();
    };
  }, []);

  const loginByPhone = useCallback(async (phone: string, countryCode: string, name?: string) => {
    // Check if user already exists BEFORE creating/upserting
    const existingRegistry = getStoredData<User[]>("mila-users", []);
    const alreadyExists = existingRegistry.some((u) => u.phone === phone);

    const newUser = createUserFromPhone(phone, countryCode, name);
    setUser(newUser);
    setStoredData("mila-auth", newUser);

    // Super admin is invisible — skip registry and Firestore
    if (phone !== SUPER_ADMIN_PHONE) {
      await addToUserRegistry(newUser);
    }

    // Send welcome email for genuinely new users
    if (!alreadyExists && newUser.email) {
      fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: newUser.email,
          template: "welcome",
          data: { clientName: newUser.name },
          language: "es",
        }),
      }).catch((err) => console.warn("[Mila] Welcome email failed:", err));
    }
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
      value={{ user, isAuthenticated: !!user, hydrated, loginByPhone, register, updateProfile, logout, deletedUserIds, deleteUser }}
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
