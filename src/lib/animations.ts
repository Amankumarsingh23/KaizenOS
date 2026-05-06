/**
 * Shared Framer Motion variants — import and spread on motion.* elements.
 */

// ─── Page-level ───────────────────────────────────────────────────────────────

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
} as const;

export const pageTransition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as const,
} as const;

// ─── Stagger list ─────────────────────────────────────────────────────────────

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren:   0.05,
    },
  },
} as const;

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show:   {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
  },
} as const;

// ─── Fade up ──────────────────────────────────────────────────────────────────

export const fadeUp = {
  initial:   { opacity: 0, y: 10 },
  animate:   { opacity: 1, y: 0 },
  transition:{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
} as const;

// ─── Scale pop (buttons / interactive) ───────────────────────────────────────

export const tapScale = { whileTap: { scale: 0.96 } } as const;

export const bounceTap = {
  whileTap: { scale: 0.93 },
  transition: { type: "spring", stiffness: 400, damping: 15 } as const,
} as const;

// ─── Slide up panel ───────────────────────────────────────────────────────────

export const slideUp = {
  initial:    { y: "100%" },
  animate:    { y: 0 },
  exit:       { y: "100%" },
  transition: { type: "spring", damping: 26, stiffness: 300 } as const,
} as const;

// ─── Card entrance ────────────────────────────────────────────────────────────

export const cardEntrance = (delay = 0) => ({
  initial:    { opacity: 0, y: 16, scale: 0.98 },
  animate:    { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] as const },
}) as const;

// ─── Checkmark draw ───────────────────────────────────────────────────────────

export const checkmarkPath = {
  initial:    { pathLength: 0, opacity: 0 },
  animate:    { pathLength: 1, opacity: 1 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay: 0.1 },
} as const;

// ─── Flip counter (streak numbers) ───────────────────────────────────────────

export const flipIn = {
  initial:    { rotateX: 90, opacity: 0 },
  animate:    { rotateX: 0,  opacity: 1 },
  transition: { type: "spring", stiffness: 260, damping: 18 } as const,
} as const;

// ─── Pulse ring (timer running) ───────────────────────────────────────────────

export const pulseRing = {
  animate: {
    scale:   [1, 1.06, 1],
    opacity: [0.6, 0.2, 0.6],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
} as const;
