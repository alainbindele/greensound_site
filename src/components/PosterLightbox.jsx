import React, { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Full-screen poster viewer: the image as large as the screen allows, over a
 * blurred black backdrop. Built on Radix Dialog, so focus is trapped while it
 * is open, Esc closes it and focus returns to whatever opened it.
 *
 * Images are shown in full colour even for past events, whose cards show them
 * desaturated: here the point is to read the poster.
 */
export default function PosterLightbox({
  images = [],
  open,
  onOpenChange,
  title = "",
  caption = "",
  startIndex = 0,
  language = "it",
  onCloseAutoFocus,
}) {
  const validImages = images.filter((img) => img && img.trim() !== "");
  const count = validImages.length;
  const [index, setIndex] = useState(startIndex);

  // Every opening starts from the image that was clicked.
  useEffect(() => {
    if (open) setIndex(Math.min(startIndex, Math.max(count - 1, 0)));
  }, [open, startIndex, count]);

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  const onKeyDown = (event) => {
    if (count < 2) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); prev(); }
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
  };

  if (count === 0) return null;

  const t = language === "it"
    ? { close: "Chiudi", prev: "Immagine precedente", next: "Immagine successiva" }
    : { close: "Close", prev: "Previous image", next: "Next image" };

  const control =
    "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          onCloseAutoFocus={onCloseAutoFocus}
          // A click on the empty area around the poster closes the viewer;
          // clicks on the image or the controls do not.
          onClick={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-8"
          aria-describedby={caption ? "poster-lightbox-caption" : undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          <img
            key={validImages[index]}
            src={validImages[index]}
            alt={count > 1 ? `${title} — ${index + 1}/${count}` : title}
            className="max-h-[calc(100dvh-9rem)] max-w-full rounded-lg object-contain shadow-2xl shadow-black/60"
          />

          {(caption || count > 1) && (
            <div className="flex max-w-2xl flex-col items-center gap-1 text-center text-white">
              {caption && (
                <p id="poster-lightbox-caption" className="text-sm font-medium text-white/90 text-balance">
                  {caption}
                </p>
              )}
              {count > 1 && (
                <p className="text-xs tabular-nums text-white/60">
                  {index + 1} / {count}
                </p>
              )}
            </div>
          )}

          {count > 1 && (
            <>
              <button type="button" aria-label={t.prev} onClick={prev}
                className={`${control} absolute left-3 top-1/2 -translate-y-1/2 sm:left-6`}>
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button type="button" aria-label={t.next} onClick={next}
                className={`${control} absolute right-3 top-1/2 -translate-y-1/2 sm:right-6`}>
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}

          <DialogPrimitive.Close aria-label={t.close}
            className={`${control} absolute right-3 top-3 sm:right-6 sm:top-6`}
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
