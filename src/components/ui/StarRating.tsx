"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.floor(rating);
        const halfFilled = !filled && i < rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              size={size}
              className={cn(
                filled
                  ? "fill-mila-gold text-mila-gold"
                  : halfFilled
                  ? "fill-mila-gold/50 text-mila-gold"
                  : "fill-none text-mila-taupe"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
