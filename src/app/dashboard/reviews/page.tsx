"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import { reviews as mockReviews } from "@/data/reviews";
import type { Booking, Review } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import StarRating from "@/components/ui/StarRating";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Star, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Review form state
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    // Load appointments
    let storedBookings = getStoredData<Booking[]>("mila-bookings", []);
    if (storedBookings.length === 0) {
      storedBookings = getInitialDemoAppointments();
      setStoredData("mila-bookings", storedBookings);
    }
    setAppointments(storedBookings);

    // Load reviews
    const storedReviews = getStoredData<Review[]>("mila-reviews", []);
    if (storedReviews.length === 0) {
      setStoredData("mila-reviews", mockReviews);
      setReviews(mockReviews);
    } else {
      setReviews(storedReviews);
    }
  }, []);

  // Completed appointments that haven't been reviewed yet
  const completedAppointments = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    return !reviews.some((r) => r.bookingId === a.id);
  });

  // User's own reviews
  const userReviews = reviews.filter((r) => r.clientId === user?.id);

  const getServiceNames = (svcIds: string[] | undefined, lang: string) => {
    if (!svcIds || svcIds.length === 0) return lang === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map(id => services.find(s => s.id === id)?.name[lang as "en" | "es"] ?? id).join(", ");
  };

  const completedOptions = completedAppointments.map((a) => {
    const serviceLabel = getServiceNames(a.serviceIds, language);
    const stylist = stylists.find((s) => s.id === a.stylistId);
    return {
      value: a.id,
      label: `${serviceLabel} - ${stylist?.name ?? a.stylistId} (${formatShortDate(a.date, language)})`,
    };
  });

  function handleSubmitReview() {
    if (!selectedBookingId || rating === 0 || !comment.trim()) {
      addToast(
        language === "es"
          ? "Completa todos los campos"
          : "Please fill all fields",
        "error"
      );
      return;
    }

    const booking = appointments.find((a) => a.id === selectedBookingId);
    if (!booking || !user) return;

    const newReview: Review = {
      id: generateId(),
      bookingId: selectedBookingId,
      clientId: user.id,
      clientName: user.name,
      stylistId: booking.stylistId,
      serviceId: booking.serviceIds?.[0] ?? "",
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedReviews = [...reviews, newReview];
    setReviews(updatedReviews);
    setStoredData("mila-reviews", updatedReviews);

    // Reset form
    setSelectedBookingId("");
    setRating(0);
    setComment("");

    addToast(
      language === "es"
        ? "Resena enviada con exito"
        : "Review submitted successfully",
      "success"
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <Star size={24} className="text-mila-gold" />
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("dashboard", "reviews")}
        </h1>
      </motion.div>

      {/* Leave a review section */}
      <motion.section variants={fadeInUp}>
        <Card>
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary mb-4">
            {t("dashboard", "leaveReview")}
          </h2>

          {completedOptions.length === 0 ? (
            <p className="text-text-muted text-sm py-4">
              {language === "es"
                ? "No tienes citas completadas para resena"
                : "No completed appointments to review"}
            </p>
          ) : (
            <div className="space-y-4">
              <Select
                label={language === "es" ? "Seleccionar cita" : "Select appointment"}
                options={completedOptions}
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                placeholder={
                  language === "es" ? "Elige una cita..." : "Choose an appointment..."
                }
              />

              <div>
                <p className="text-sm font-medium text-text-secondary mb-1.5">
                  {language === "es" ? "Tu puntuacion" : "Your rating"}
                </p>
                <StarRating
                  rating={rating}
                  size={28}
                  interactive
                  onChange={setRating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t("dashboard", "yourReview")}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder={
                    language === "es"
                      ? "Comparte tu experiencia..."
                      : "Share your experience..."
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-mila-gold/30 focus:border-mila-gold transition-all duration-200 resize-none"
                />
              </div>

              <Button onClick={handleSubmitReview}>
                {t("dashboard", "submitReview")}
              </Button>
            </div>
          )}
        </Card>
      </motion.section>

      {/* Your reviews */}
      <motion.section variants={fadeInUp}>
        <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary mb-4 flex items-center gap-2">
          <MessageSquare size={18} className="text-mila-gold" />
          {language === "es" ? "Tus Resenas" : "Your Reviews"}
        </h2>

        {userReviews.length === 0 ? (
          <Card>
            <p className="text-text-muted text-center py-6">
              {language === "es"
                ? "Aun no has dejado resenas"
                : "You haven't left any reviews yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {userReviews
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((review, i) => {
                const service = services.find(
                  (s) => s.id === review.serviceId
                );
                const stylist = stylists.find(
                  (s) => s.id === review.stylistId
                );

                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                  >
                    <Card>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-text-primary">
                            {service?.name[language] ?? review.serviceId}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {stylist?.name ?? review.stylistId}
                          </p>
                        </div>
                        <p className="text-xs text-text-muted flex-shrink-0">
                          {formatShortDate(
                            review.createdAt.split("T")[0],
                            language
                          )}
                        </p>
                      </div>
                      <StarRating rating={review.rating} size={16} className="mb-2" />
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {review.comment}
                      </p>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
