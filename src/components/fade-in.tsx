"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"

/**
 * Fade-in on scroll wrapper using Motion.
 * Animates children from below with opacity transition when they enter the viewport.
 */
export function FadeIn({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode
    delay?: number
    className?: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
