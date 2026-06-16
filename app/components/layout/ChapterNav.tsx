"use client";

import { motion } from "framer-motion";

export type AppScreen = "assessment" | "dashboard" | "coach" | "progress" | "audit";

interface Chapter {
  id: AppScreen;
  label: string;
  number: string;
  /** Screen requires a completed assessment before it is accessible */
  requiresResult: boolean;
}

const chapters: Chapter[] = [
  { id: "assessment", label: "Assessment", number: "01", requiresResult: false },
  { id: "dashboard", label: "Carbon Story", number: "02", requiresResult: true },
  { id: "coach", label: "Coach", number: "03", requiresResult: true },
  { id: "progress", label: "Journey", number: "04", requiresResult: true },
  { id: "audit", label: "Audit", number: "05", requiresResult: true },
];

interface ChapterNavProps {
  activeScreen: AppScreen;
  hasResult: boolean;
  onNavigate: (screen: AppScreen) => void;
}

/**
 * ChapterNav — sticky pill navigation with chapter numbers.
 *
 * Chapters that require a completed assessment are visually
 * dimmed and non-interactive until the user has run an assessment.
 * The active chapter highlights with the signal-green accent.
 */
export function ChapterNav({ activeScreen, hasResult, onNavigate }: ChapterNavProps) {
  return (
    <nav
      aria-label="EarthIQ chapters"
      className="sticky top-3 z-20 mb-10 flex gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-2xl"
    >
      {chapters.map((chapter) => {
        const isActive = activeScreen === chapter.id;
        const isLocked = chapter.requiresResult && !hasResult;

        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => !isLocked && onNavigate(chapter.id)}
            disabled={isLocked}
            aria-current={isActive ? "page" : undefined}
            aria-disabled={isLocked}
            title={isLocked ? "Complete the assessment to unlock" : undefined}
            className="relative min-h-11 shrink-0 rounded-full px-5 text-sm font-medium transition-all duration-200"
            style={{
              background: isActive ? "var(--color-signal)" : "transparent",
              color: isActive
                ? "#000"
                : isLocked
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.65)",
              cursor: isLocked ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isLocked) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.10)";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isLocked) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.65)";
              }
            }}
          >
            <span
              className="mr-1.5 font-mono text-[10px] opacity-40"
              aria-hidden="true"
            >
              {chapter.number}
            </span>
            {chapter.label}

            {/* Active indicator underline */}
            {isActive && (
              <motion.span
                layoutId="chapter-indicator"
                className="sr-only"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
