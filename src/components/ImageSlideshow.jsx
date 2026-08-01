import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { useReducedMotion } from "framer-motion";

/**
 * Image carousel used by events, articles and news cards.
 *
 * Controls stay hidden until the group is hovered *or* focused, so keyboard
 * users can still reach them — an opacity-0 button that never becomes visible
 * on focus is a trap. On touch devices, where there is no hover, the controls
 * are always visible.
 */
export default function ImageSlideshow({
  images = [],
  alt = "",
  className = "",
  autoPlay = false,
}) {
  const reduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  // Auto-advance is motion; if the visitor asked for less of it, start paused.
  const [isPlaying, setIsPlaying] = useState(autoPlay && !reduceMotion);

  // Filter out empty or null images and use image_url as fallback
  const validImages = images.filter((img) => img && img.trim() !== "");
  const count = validImages.length;

  const nextImage = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % count);
  }, [count]);

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + count) % count);
  };

  // Single owner of the timer: no stray intervals left behind on re-render.
  useEffect(() => {
    if (!isPlaying || count < 2) return undefined;
    const id = setInterval(nextImage, 3000);
    return () => clearInterval(id);
  }, [isPlaying, count, nextImage]);

  // Guard against an index left dangling when the image list shrinks.
  useEffect(() => {
    if (currentIndex >= count) setCurrentIndex(0);
  }, [count, currentIndex]);

  if (count === 0) {
    return null;
  }

  if (count === 1) {
    return (
      <div className={`relative h-full overflow-hidden ${className}`}>
        <img
          src={validImages[0]}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Visible on hover, on keyboard focus, and always where hover does not exist.
  const controlVisibility =
    "opacity-100 md:opacity-0 md:group-hover/slides:opacity-100 md:group-focus-within/slides:opacity-100 transition-opacity duration-300";
  const controlChrome =
    "bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 hover:text-white";

  return (
    <div
      className={`group/slides relative h-full overflow-hidden ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={alt}
    >
      <div className="relative h-full w-full">
        <img
          src={validImages[currentIndex]}
          alt={`${alt} — ${currentIndex + 1}/${count}`}
          className="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />

        <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {currentIndex + 1} / {count}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous image"
          className={`absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2 ${controlChrome} ${controlVisibility}`}
          onClick={prevImage}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next image"
          className={`absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 ${controlChrome} ${controlVisibility}`}
          onClick={nextImage}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
          className={`absolute bottom-3 right-3 h-9 w-9 ${controlChrome} ${controlVisibility}`}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div
        className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 ${controlVisibility}`}
      >
        {validImages.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to image ${index + 1}`}
            aria-current={index === currentIndex}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "w-6 bg-brand"
                : "w-2 bg-white/60 hover:bg-white/90"
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
