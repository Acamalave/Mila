"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useBooking } from "@/providers/BookingProvider";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import type { Booking } from "@/types";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SpecialistSlider from "@/components/landing/SpecialistSlider";
import ServiceSelector from "@/components/landing/ServiceSelector";
import CalendarPicker from "@/components/landing/CalendarPicker";
import BookingSuccess from "@/components/landing/BookingSuccess";
import PhoneLoginModal from "@/components/landing/PhoneLoginModal";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { state, dispatch, resetBooking } = useBooking();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingBook, setPendingBook] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      const hasBookingInProgress = state.selectedStylistId !== null;
      if (!hasBookingInProgress && !showSuccess) {
        router.push("/dashboard");
      }
    }
  }, [hydrated, isAuthenticated, router, state.selectedStylistId, showSuccess]);

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

  // Handle booking confirmation
  const handleBook = useCallback(() => {
    const booking: Booking = {
      id: generateId(),
      serviceIds: state.isGeneralAppointment ? [] : state.selectedServiceIds,
      stylistId: state.selectedStylistId!,
      clientId: user?.id ?? null,
      date: state.selectedDate!,
      startTime: state.selectedTimeSlot!.startTime,
      endTime: state.selectedTimeSlot!.endTime,
      status: "confirmed",
      totalPrice: 0,
      notes: state.notes,
      createdAt: new Date().toISOString(),
    };

    const existing = getStoredData<Booking[]>("mila-bookings", []);
    setStoredData("mila-bookings", [...existing, booking]);

    dispatch({ type: "GO_TO_STEP", payload: 4 });
    setShowSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state, user, dispatch]);

  // Handle login required during booking
  const handleLoginRequired = useCallback(() => {
    setPendingBook(true);
    setShowLoginModal(true);
  }, []);

  // After successful login, proceed with booking
  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    if (pendingBook) {
      setPendingBook(false);
      setTimeout(() => handleBook(), 100);
    }
  }, [pendingBook, handleBook]);

  // Go to dashboard after booking
  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Book another appointment
  const handleBookAnother = useCallback(() => {
    resetBooking();
    setShowSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetBooking]);

  // Don't render until hydrated
  if (!hydrated) return null;

  // Show success screen
  if (showSuccess) {
    return (
      <>
        <Header />
        <BookingSuccess
          onGoToDashboard={handleGoToDashboard}
          onBookAnother={handleBookAnother}
        />
      </>
    );
  }

  const showServices = state.selectedStylistId !== null;
  const showCalendar = showServices && (state.selectedServiceIds.length > 0 || state.isGeneralAppointment);

  return (
    <>
      <Header />

      <main className="relative" style={{ paddingTop: 56, background: "var(--color-bg-page)", minHeight: "100vh", transition: "background 0.3s ease" }}>
        {/* Animated gradient blobs for glass effect */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div
            className="absolute animate-blob-1"
            style={{
              top: "10%",
              left: "15%",
              width: "clamp(300px, 40vw, 600px)",
              height: "clamp(300px, 40vw, 600px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--blob-color-1) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute animate-blob-2"
            style={{
              bottom: "20%",
              right: "10%",
              width: "clamp(250px, 35vw, 500px)",
              height: "clamp(250px, 35vw, 500px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--blob-color-2) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute animate-blob-3"
            style={{
              top: "50%",
              left: "50%",
              width: "clamp(200px, 30vw, 450px)",
              height: "clamp(200px, 30vw, 450px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--blob-color-3) 0%, transparent 70%)",
              filter: "blur(80px)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Content layers above gradient */}
        <div className="relative" style={{ zIndex: 1 }}>
        {/* Step 1: Specialist Selection - directly, no hero */}
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
        </div>
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
