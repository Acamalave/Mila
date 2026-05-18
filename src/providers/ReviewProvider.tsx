"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Review } from "@/types";
import { generateId, getStoredData, setStoredData } from "@/lib/utils";
import { setDocument, onCollectionChange } from "@/lib/firestore";

interface ReviewContextValue {
  reviews: Review[];
  addReview: (data: Omit<Review, "id" | "createdAt">) => Review;
  getReviewsForStylist: (stylistId: string) => Review[];
  getReviewsForClient: (clientId: string) => Review[];
  getReviewForBooking: (bookingId: string) => Review | undefined;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(() =>
    getStoredData<Review[]>("mila-reviews", [])
  );

  const persist = useCallback((next: Review[]) => {
    setStoredData("mila-reviews", next);
  }, []);

  const addReview = useCallback(
    (data: Omit<Review, "id" | "createdAt">): Review => {
      const newReview: Review = {
        ...data,
        id: `rev-${generateId()}`,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => {
        const next = [...prev, newReview];
        persist(next);
        return next;
      });
      const { id, ...payload } = newReview;
      setDocument("reviews", id, payload).catch((err) =>
        console.warn("[Mila] Review sync failed:", err)
      );
      return newReview;
    },
    [persist]
  );

  const getReviewsForStylist = useCallback(
    (stylistId: string) => reviews.filter((r) => r.stylistId === stylistId),
    [reviews]
  );

  const getReviewsForClient = useCallback(
    (clientId: string) => reviews.filter((r) => r.clientId === clientId),
    [reviews]
  );

  const getReviewForBooking = useCallback(
    (bookingId: string) => reviews.find((r) => r.bookingId === bookingId),
    [reviews]
  );

  // Firestore real-time sync — same merge pattern as other providers
  useEffect(() => {
    const unsub = onCollectionChange<Review>("reviews", (firestoreReviews) => {
      if (firestoreReviews.length > 0) {
        setReviews((prev) => {
          const merged = new Map<string, Review>();
          for (const r of prev) merged.set(r.id, r);
          for (const r of firestoreReviews) merged.set(r.id, r);
          const next = Array.from(merged.values());
          persist(next);
          return next;
        });
      }
    });
    return () => unsub();
  }, [persist]);

  const value = useMemo(
    () => ({
      reviews,
      addReview,
      getReviewsForStylist,
      getReviewsForClient,
      getReviewForBooking,
    }),
    [reviews, addReview, getReviewsForStylist, getReviewsForClient, getReviewForBooking]
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviews(): ReviewContextValue {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("useReviews must be used within a ReviewProvider");
  return context;
}
