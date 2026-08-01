import React, { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Scroll-motion primitives.
 *
 * Every one of these collapses to a plain, instant, fully-visible element when
 * the visitor asks for reduced motion — content is never gated behind an
 * animation that will not play.
 */

const EASE = [0.22, 1, 0.36, 1];

/** Fade + rise as the element scrolls into view. Fires once. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
  as = "div",
  ...rest
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;

  if (reduce) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Parent for a staggered group. Pair with <StaggerItem>. */
export function Stagger({ children, className = "", gap = 0.08, ...rest }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "", y = 28, ...rest }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: EASE },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Depth parallax. `speed` is how far the layer travels across its own scroll
 * range, as a fraction of the viewport — keep it small (0.05–0.25) so nothing
 * detaches from the content it belongs to.
 */
export function Parallax({ children, speed = 0.12, className = "" }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`]);
  const y = useSpring(raw, { stiffness: 90, damping: 26, mass: 0.4 });

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/** Thin progress bar showing how far through the page the visitor is. */
export function ScrollProgress({ className = "" }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className={`origin-left bg-gradient-to-r from-signal-nature via-brand to-signal-tech ${className}`}
    />
  );
}
