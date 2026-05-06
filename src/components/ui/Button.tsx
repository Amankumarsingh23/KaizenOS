"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonProps = Omit<HTMLMotionProps<"button">, "ref"> & {
  variant?: "primary" | "sage" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  noTap?: boolean;
};

const variants = {
  primary:   "bg-ink text-cream hover:bg-ink/90 shadow-[0_1px_3px_rgba(0,0,0,0.12)]",
  sage:      "bg-sage text-white hover:bg-sage/90 shadow-[0_1px_3px_rgba(0,0,0,0.12)]",
  secondary: "bg-white text-ink border border-mist hover:bg-mist/40",
  ghost:     "text-ink hover:bg-mist/50",
  danger:    "bg-terracotta text-white hover:bg-terracotta/90",
};

const sizes = {
  sm:   "px-3 py-1.5 text-sm rounded-lg",
  md:   "px-4 py-2.5 text-sm rounded-xl",
  lg:   "px-6 py-3 text-base rounded-xl",
  icon: "p-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, noTap, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={disabled || noTap ? {} : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium font-sans transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
);
Button.displayName = "Button";

// ─── Success Checkmark ────────────────────────────────────────────────────────

export function SuccessCheckmark({ size = 20, color = "#6B8F71" }: {
  size?: number;
  color?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
    >
      <motion.circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }} />
      <motion.path
        d="M7 12.5l3.5 3.5L17 9"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
      />
    </motion.svg>
  );
}
