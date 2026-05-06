"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  /** delay before first child appears */
  delay?: number;
}

/** Wraps a list of children and staggers their entrance */
export function StaggerList({ children, className, delay = 0 }: StaggerListProps) {
  const container = {
    ...staggerContainer,
    show: {
      transition: {
        staggerChildren: 0.07,
        delayChildren:   delay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** Item inside a StaggerList */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/** Animated card that fades + slides up on first render */
export function AnimatedCard({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
