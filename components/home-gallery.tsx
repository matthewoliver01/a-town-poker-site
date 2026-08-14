"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface HomeGalleryItem {
  id: string;
  src: string;
  caption?: string;
  href?: string;
  eventLabel?: string;
}

export function HomeGallery({ items }: { items: HomeGalleryItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [interactionPaused, setInteractionPaused] = useState(false);

  useEffect(() => {
    if (
      items.length < 2 ||
      interactionPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % items.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [interactionPaused, items.length]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return null;
  }

  const activeItem = items[activeIndex] ?? items[0];

  const changeSlide = (offset: number) => {
    setActiveIndex((index) => (index + offset + items.length) % items.length);
  };

  const image = (
    // Photo paths are workbook-authored and can point to either public files or remote storage.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeItem.src}
      alt={activeItem.caption || activeItem.eventLabel || "A-Town Poker photo"}
      width={2048}
      height={1536}
      className="h-full w-full object-contain"
    />
  );

  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={() => setInteractionPaused(false)}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {activeItem.href ? (
          <Link href={activeItem.href} className="block h-full">
            {image}
          </Link>
        ) : (
          image
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-20 text-white">
          {activeItem.eventLabel ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
              {activeItem.eventLabel}
            </p>
          ) : null}
          {activeItem.caption ? (
            <p className="mt-1 max-w-2xl text-base font-medium sm:text-lg">
              {activeItem.caption}
            </p>
          ) : null}
        </div>

        {items.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => changeSlide(-1)}
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => changeSlide(1)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {items.length > 1 ? (
        <div
          className="flex items-center justify-center gap-1.5 px-4 py-3"
          aria-label="Choose a photo"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === activeIndex
                  ? "w-7 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground/50",
              )}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeIndex}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
