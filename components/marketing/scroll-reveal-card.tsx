"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.08,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

type ScrollRevealCardProps = {
  children: ReactNode;
  index?: number;
  className?: string;
};

export function ScrollRevealCard({ children, index = 0, className }: ScrollRevealCardProps) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-72px", amount: 0.15 }}
      variants={cardVariants}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
