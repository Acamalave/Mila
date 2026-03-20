"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useBooking } from "@/providers/BookingProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { setDocument } from "@/lib/firestore";
import { services } from "@/data/services";
import type { Booking } from "@/types";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SpecialistSlider from "@/components/landing/SpecialistSlider";
import ServiceSelector from "@/components/landing/ServiceSelector";
import CalendarPicker from "@/components/landing/CalendarPicker";
import PhoneLoginModal from "@/components/landing/PhoneLoginModal";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { state, dispatch, resetBooking } = useBooking();
  const { emit } = useEventBus();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingBook, setPendingBook] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      const hasBookingInProgress = state.selectedStylistId !== null;
      if (!hasBookingInProgress) {
        router.push("/dashboard");
      }
    }
  }, [hydrated, isAuthenticated, router, state.selectedStylistId]);

  // Smooth scroll to section
  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // When specialist is selected, show services and scroll
  const handleSpecialistSelect = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 2 });
    scrollToSection(servicesRef);
  }, [dispatch, scrollToSection]);

  // When services are confirmed, show calendar and scroll
  const handleServicesContinue = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 3 });
    scrollToSection(calendarRef);
  }, [dispatch, scrollToSection]);

  // Handle booking confirmation with conflict check
  const handleBook = useCallback(() => {
    const selectedServices = state.isGeneralAppointment
      ? []
      : state.selectedServiceIds;
    const totalPrice = selectedServices.reduce((sum, sId) => {
      const svc = services.find((s) => s.id === sId);
      return sum + (svc?.price ?? 0);
    }, 0);

    const booking: Booking = {
      id: generateId(),
      serviceIds: selectedServices,
      stylistId: state.selectedStylistId!,
      clientId: user?.id ?? null,
      date: state.selectedDate!,
      startTime: state.selectedTimeSlot!.startTime,
      endTime: state.selectedTimeSlot!.endTime,
      status: "confirmed",
      totalPrice,
      notes: state.notes,
      createdAt: new Date().toISOString(),
    };

    // Final conflict check before saving (optimistic lock)
    const existing = getStoredData<Booking[]>("mila-bookings", []);
    const hasConflict = existing.some(
      (b) =>
        b.stylistId === booking.stylistId &&
        b.date === booking.date &&
        (b.status === "confirmed" || b.status === "pending") &&
        booking.startTime < b.endTime &&
        booking.endTime > b.startTime
    );

    if (hasConflict) {
      alert("This time slot was just booked. Please select a different time.");
      return;
    }

    setStoredData("mila-bookings", [...existing, booking]);
    const { id, ...bookingData } = booking;
    setDocument("bookings", id, bookingData).catch((err) => console.warn("[Mila] Booking sync failed:", err));
    emit("booking:updated", booking);

    resetBooking();
    router.push("/dashboard");
  }, [state, user, resetBooking, router]);

  // Handle login required during booking
  const handleLoginRequired = useCallback(() => {
    setPendingBook(true);
    setShowLoginModal(true);
  }, []);

  // After successful login, proceed with booking
  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  // When login completes and user is available, finalize the pending booking
  useEffect(() => {
    if (pendingBook && user?.id) {
      setPendingBook(false);
      handleBook();
    }
  }, [pendingBook, user, handleBook]);

  // Don't render until hydrated
  if (!hydrated) return null;

  const showServices = state.selectedStylistId !== null;
  const showCalendar = showServices && (state.selectedServiceIds.length > 0 || state.isGeneralAppointment);

  return (
    <>
      <Header />

      <main className="relative" style={{ background: "var(--color-bg-page)", minHeight: "100vh" }}>
        {/* Step 1: Specialist Selection - Full screen editorial */}
        <SpecialistSlider onSelect={handleSpecialistSelect} />

        {/* Step 2: Service Selection */}
        <AnimatePresence>
          {showServices && state.selectedStylistId && (
            <motion.div
              ref={servicesRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ServiceSelector
                stylistId={state.selectedStylistId}
                onContinue={handleServicesContinue}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Calendar & Time */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <CalendarPicker
                onBook={handleBook}
                onLoginRequired={handleLoginRequired}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Phone Login Modal */}
      <PhoneLoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingBook(false);
        }}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
