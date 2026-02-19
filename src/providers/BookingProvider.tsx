"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { BookingFlowState, TimeSlot } from "@/types";

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

  return (
    <BookingContext.Provider value={{ state, dispatch, resetBooking, canProceed }}>
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
