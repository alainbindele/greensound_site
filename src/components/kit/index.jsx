import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Shared surface + section primitives.
 *
 * These exist so every public page renders the same glass card, the same
 * heading rhythm, the same empty state and the same loading skeleton. Pages
 * should compose these rather than re-declaring `glass-morphism border-white/20
 * bg-black/20` by hand.
 */

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Glass card that tracks the pointer with a soft brand-coloured spotlight.
 * The highlight is pure CSS driven by two custom properties, so moving the
 * mouse never triggers a React render.
 */
export function SpotlightCard({
  children,
  className = "",
  interactive = true,
  as: Tag = "div",
  ...rest
}) {
  const ref = useRef(null);

  const onPointerMove = useCallback(
    (event) => {
      if (!interactive || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      ref.current.style.setProperty("--my", `${event.clientY - rect.top}px`);
    },
    [interactive]
  );

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn(
        "group/card relative overflow-hidden rounded-xl glass shadow-e1",
        interactive && "card-lift",
        className
      )}
      {...rest}
    >
      {interactive && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background:
              "radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), hsl(var(--brand) / 0.16), transparent 65%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </Tag>
  );
}

/** Small pill used for metadata, categories and status. */
export function Chip({ children, tone = "brand", className = "", ...rest }) {
  const tones = {
    brand: "bg-brand/10 text-brand ring-brand/25",
    solar: "bg-solar/10 text-solar ring-solar/30",
    muted: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone] || tones.brand,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Structure                                                                   */
/* -------------------------------------------------------------------------- */

/** Standard page header: eyebrow, gradient title, supporting line. */
export function PageHero({ eyebrow, title, subtitle, children, icon: Icon }) {
  return (
    <header className="relative overflow-hidden pb-12 pt-28 md:pt-36">
      <div className="aurora-field" aria-hidden="true" />
      <div className="shell relative z-10 text-center">
        <Reveal>
          {eyebrow && (
            <p className="eyebrow mb-4 flex items-center justify-center gap-2">
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {eyebrow}
            </p>
          )}
          <h1 className="text-gradient-bio text-4xl font-bold tracking-tight md:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
        <div className="hairline mx-auto mt-12 w-2/3 max-w-xl" aria-hidden="true" />
      </div>
    </header>
  );
}

/** Section-level heading with an optional trailing action. */
export function SectionHeading({ title, description, action, className = "" }) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="text-2xl font-bold text-brand md:text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  States                                                                      */
/* -------------------------------------------------------------------------- */

/** Empty state: says what is missing and what happens next. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <SpotlightCard interactive={false} className="mx-auto max-w-xl">
      <div className="p-12 text-center">
        {Icon && (
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Icon className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
        )}
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        {description && <p className="text-muted-foreground">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </SpotlightCard>
  );
}

/**
 * Skeleton placeholder shaped like the card it replaces, so the layout does
 * not shift when real content lands (CLS).
 */
export function CardSkeleton({ media = true }) {
  return (
    <div className="overflow-hidden rounded-xl glass shadow-e1">
      {media && <div className="relative h-48 overflow-hidden bg-muted">{shimmer}</div>}
      <div className="space-y-4 p-6">
        <div className="relative h-5 w-3/4 overflow-hidden rounded bg-muted">
          {shimmer}
        </div>
        <div className="relative h-3 w-1/2 overflow-hidden rounded bg-muted">
          {shimmer}
        </div>
        <div className="space-y-2 pt-2">
          <div className="relative h-3 overflow-hidden rounded bg-muted">{shimmer}</div>
          <div className="relative h-3 overflow-hidden rounded bg-muted">{shimmer}</div>
          <div className="relative h-3 w-4/5 overflow-hidden rounded bg-muted">
            {shimmer}
          </div>
        </div>
      </div>
    </div>
  );
}

const shimmer = (
  <span
    aria-hidden="true"
    className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent"
  />
);

/** Grid of skeletons matching the real card grid. */
export function SkeletonGrid({ count = 6, media = true, label = "Loading" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} media={media} />
      ))}
    </div>
  );
}
