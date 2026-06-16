"use client";

import { motion } from "framer-motion";

/**
 * CinematicBackdrop — fixed full-viewport background layer.
 *
 * Renders:
 *  1. CSS star field (`.stars` keyframe defined in globals.css)
 *  2. Rotating signal-green orb with radial gradient
 *  3. Secondary breathing glow layer
 *  4. Top edge fade to void
 *  5. Radial vignette overlay
 */
export function CinematicBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {/* Star field — defined via CSS keyframe in globals.css */}
      <div className="stars absolute inset-0" />

      {/* Primary orb — slow rotation */}
      <motion.div
        className="absolute left-1/2 top-[-18rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full border border-[#a3ffb0]/20 blur-[1px]"
        style={{
          background:
            "radial-gradient(circle at 50% 58%, rgba(163,255,176,0.32), rgba(44,117,255,0.14) 34%, rgba(255,255,255,0.04) 52%, transparent 68%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      />

      {/* Secondary glow — breathing pulse */}
      <motion.div
        className="absolute left-1/2 top-[-22rem] h-[54rem] w-[54rem] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(163,255,176,0.07) 0%, transparent 65%)",
          filter: "blur(48px)",
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Top edge fade to void */}
      <div
        className="absolute inset-x-0 top-0 h-80"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,5,0.2), #050505)",
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 12%, transparent, rgba(5,5,5,0.82) 62%, #050505 100%)",
        }}
      />
    </div>
  );
}
