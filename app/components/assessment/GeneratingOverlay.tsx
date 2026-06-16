"use client";

import { motion } from "framer-motion";

/**
 * GeneratingOverlay — full-viewport cinematic transition shown
 * while EarthIQ processes the assessment data.
 * Rendered at the root level of EarthIqApp so it overlays everything.
 */
export function GeneratingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(5,5,5,0.96)", backdropFilter: "blur(28px)" }}
      aria-live="polite"
      aria-label="EarthIQ is processing your assessment"
    >
      {/* Concentric rotating arcs */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="h-36 w-36 rounded-full border-2"
          style={{
            borderColor: "transparent",
            borderTopColor: "var(--color-signal)",
            borderRightColor: "rgba(163,255,176,0.35)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute h-24 w-24 rounded-full border"
          style={{
            borderColor: "transparent",
            borderBottomColor: "rgba(163,255,176,0.3)",
            borderLeftColor: "rgba(255,255,255,0.08)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute h-12 w-12 rounded-full border"
          style={{
            borderColor: "transparent",
            borderTopColor: "rgba(163,255,176,0.5)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        {/* Center dot */}
        <div
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            background: "var(--color-signal)",
            boxShadow: "0 0 16px var(--color-signal-glow)",
          }}
        />
      </div>

      {/* Text */}
      <motion.p
        className="mt-12 text-xs font-medium uppercase tracking-[0.32em]"
        style={{ color: "var(--color-signal)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        Reading your signals
      </motion.p>

      <motion.h2
        className="mt-4 text-xl font-medium text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        EarthIQ is composing your carbon story
      </motion.h2>

      <motion.p
        className="mt-2 text-sm text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Analyzing patterns across all four dimensions
      </motion.p>

      {/* Data dimension pills */}
      <motion.div
        className="mt-10 flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        {["Transport", "Energy", "Diet", "Lifestyle"].map((dim, i) => (
          <motion.span
            key={dim}
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/50"
            animate={{ borderColor: ["rgba(255,255,255,0.10)", "rgba(163,255,176,0.5)", "rgba(255,255,255,0.10)"] }}
            transition={{ duration: 1.6, delay: i * 0.4, repeat: Infinity }}
          >
            {dim}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
