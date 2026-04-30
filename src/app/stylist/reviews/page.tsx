"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useReviews } from "@/providers/ReviewProvider";
import { formatShortDate } from "@/lib/date-utils";
import Card from "@/components/ui/Card";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Star, MessageSquare } from "lucide-react";

export default function StylistReviewsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone } = useStaff();
  const { getReviewsForStylist } = useReviews();

  const stylist = user?.phone ? getStylistByPhone(user.phone) : undefined;

  const reviews = useMemo(
    () => (stylist ? getReviewsForStylist(stylist.id) : []),
    [stylist, getReviewsForStylist]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return stylist?.rating ?? 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, stylist]);

  const totalReviews = reviews.length > 0 ? reviews.length : (stylist?.reviewCount ?? 0);

  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews]
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("stylistDash", "myReviews")}
        </h1>
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={fadeInUp}>
        <Card className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <p className="text-5xl font-bold text-text-primary">{averageRating}</p>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.round(averageRating) ? "#C4A96A" : "transparent"}
                  color={i < Math.round(averageRating) ? "#C4A96A" : "#ABA595"}
                />
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              {t("stylistDash", "averageRating")}
            </p>
          </div>
          <div className="hidden sm:block w-px h-16 bg-border-default" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-mila-gold/10">
              <MessageSquare size={22} className="text-mila-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalReviews}</p>
              <p className="text-sm text-text-secondary">
                {t("stylistDash", "totalReviews")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Reviews List */}
      <motion.div variants={fadeInUp} className="space-y-4">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <Card key={review.id}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {review.clientName}
                    </p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={i < review.rating ? "#C4A96A" : "transparent"}
                          color={i < review.rating ? "#C4A96A" : "#ABA595"}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatShortDate(review.createdAt.split("T")[0], language)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {review.comment}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div className="py-8 text-center">
              <MessageSquare size={32} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted">
                {language === "es"
                  ? "Las resenas apareceran aqui cuando los clientes dejen comentarios"
                  : "Reviews will appear here as clients leave feedback"}
              </p>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
