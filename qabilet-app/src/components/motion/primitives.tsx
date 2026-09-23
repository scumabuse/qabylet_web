"use client";

import React from "react";
import { motion, MotionConfig, type HTMLMotionProps, type Variants } from "motion/react";

/** Ease-out curve used across the product. No overshoot. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Honors prefers-reduced-motion for every motion component below it. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: EASE }}>
      {children}
    </MotionConfig>
  );
}

type FadeInProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/** Fades content in with a small upward offset on mount. */
export function FadeIn({ delay = 0, y = 8, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

type StaggerProps = HTMLMotionProps<"div"> & { stagger?: number; delay?: number };

/** Parent for lists and grids; children should be StaggerItem. */
export function Stagger({ stagger = 0.04, delay = 0, children, ...props }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}

/** Scroll-triggered reveal. Reserved for the landing-style home sections. */
export function Reveal({ delay = 0, children, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Route-level enter transition. Key it by pathname. */
export function PageTransition({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
