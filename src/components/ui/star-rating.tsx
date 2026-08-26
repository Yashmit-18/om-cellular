"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating?: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeMap = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

export default function StarRating({
  rating = 0,
  maxStars = 5,
  size = "md",
  interactive = false,
  onChange,
  className = "",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const displayRating = hovered || rating;

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const value = i + 1;
        const filled = value <= displayRating;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(value)}
            onMouseEnter={() => interactive && setHovered(value)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
              focus:outline-none disabled:opacity-100`}
          >
            <Star
              className={`${sizeMap[size]} transition-colors duration-100
                ${filled ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-300"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
