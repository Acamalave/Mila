"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Booking, BookingFlowState, TimeSlot } from "@/types";
import { getStoredData, setStoredData } from "@/lib/utils";
import { onCollectionChange, onDocumentChange, setDocument } from "@/lib/firestore";

type BookingAction =
  | { type: "SET_STYLIST"; payload: string }
  | { type: "TOGGLE_SERVICE"; payload: string }
  | { type: "SET_GENERAL_APPOINTMENT"; payload: boolean }
  | { type: "SET_DATE"; payload: string }
  | { type: "SET_TIME_SLOT"; payload: TimeSlot }
  | { type: "SET_NOTES"; payload: string }
  | { type: "GO_TO_STEP"; payload: 1 | 2 | 3 | 4 }
  | { type: "RESET" };

interface BookingContextValue {
  state: BookingFlowState;
  dispatch: React.Dispatch<BookingAction>;
  resetBooking: () => void;
  canProceed: boolean;
  bookings: Booking[];
}

const BookingContext = createContext<BookingContextValue | null>(null);

const initialState: BookingFlowState = {
  step: 1,
  selectedStylistId: null,
  selectedServiceIds: [],
  isGeneralAppointment: false,
  selectedDate: null,
  selectedTimeSlot: null,
  notes: "",
};

function bookingReducer(
  state: BookingFlowState,
  action: BookingAction
): BookingFlowState {
  switch (action.type) {
    case "SET_STYLIST":
      return {
        ...state,
        selectedStylistId: action.payload,
        selectedServiceIds: [],
        isGeneralAppointment: false,
      };
    case "TOGGLE_SERVICE": {
      const id = action.payload;
      const exists = state.selectedServiceIds.includes(id);
      return {
        ...state,
        selectedServiceIds: exists
          ? state.selectedServiceIds.filter((s) => s !== id)
          : [...state.selectedServiceIds, id],
        isGeneralAppointment: false,
      };
    }
    case "SET_GENERAL_APPOINTMENT":
      return {
        ...state,
        isGeneralAppointment: action.payload,
        selectedServiceIds: [],
      };
    case "SET_DATE":
      return { ...state, selectedDate: action.payload, selectedTimeSlot: null };
    case "SET_TIME_SLOT":
      return { ...state, selectedTimeSlot: action.payload };
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "GO_TO_STEP":
      return { ...state, step: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function computeCanProceed(state: BookingFlowState): boolean {
  switch (state.step) {
    case 1:
      return state.selectedStylistId !== null;
    case 2:
      return state.selectedServiceIds.length > 0 || state.isGeneralAppointment;
    case 3:
      return state.selectedDate !== null && state.selectedTimeSlot !== null;
    case 4:
      return true;
    default:
      return false;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const canProceed = useMemo(() => computeCanProceed(state), [state]);

  const resetBooking = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Bookings state: merged from localStorage + Firestore
  const [bookings, setBookings] = useState<Booking[]>(() =>
    getStoredData<Booking[]>("mila-bookings", [])
  );

  // Firestore real-time listener for bookings collection
  useEffect(() => {
    // Listen to Firestore-synced deleted IDs so all devices respect deletions
    const unsubDeleted = onDocumentChange<{ ids?: string[] }>(
      "bookings-config", "deleted",
      (data) => {
        if (data?.ids) {
          const merged = Array.from(new Set([
            ...getStoredData<string[]>("mila-bookings-deleted", []),
            ...data.ids,
          ]));
          setStoredData("mila-bookings-deleted", merged);
        }
      }
    );

    const unsub = onCollectionChange<Booking>("bookings", (firestoreBookings) => {
      // Re-read deleted IDs fresh on every sync to pick up runtime changes
      const currentDeleted = new Set(getStoredData<string[]>("mila-bookings-deleted", []));
      setBookings((prev) => {
        const merged = new Map<string, Booking>();
        for (const b of prev) if (!currentDeleted.has(b.id)) merged.set(b.id, b);
        for (const b of firestoreBookings) if (!currentDeleted.has(b.id)) merged.set(b.id, b);
        const next = Array.from(merged.values());
        setStoredData("mila-bookings", next);
        return next;
      });
    });
    return () => { unsub(); unsubDeleted(); };
  }, []);

  return (
    <BookingContext.Provider value={{ state, dispatch, resetBooking, canProceed, bookings }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
