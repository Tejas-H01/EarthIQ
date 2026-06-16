"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { EarthIqAssessmentResult, summarizeProgress } from "@/application";
import type { CoachResponse } from "@/types";

// ─── Local types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "coach";
  content: string;
  response?: CoachResponse;
}

type ProgressSummary = ReturnType<typeof summarizeProgress>;

// ─── Static data ──────────────────────────────────────────────────────────────

const SUGGESTED = [
  { q: "Why is transportation my largest impact?",    hint: "Hotspot analysis"     },
  { q: "What should I focus on this week?",           hint: "Weekly strategy"      },
  { q: "Create a low-cost sustainability plan.",      hint: "Goal planning"        },
  { q: "How much progress have I made?",              hint: "Progress summary"     },
  { q: "What action gives the highest impact?",       hint: "Top recommendation"   },
  { q: "Explain my EarthIQ report.",                  hint: "Report breakdown"     },
];

const TYPE_LABEL: Record<string, string> = {
  weekly_focus:               "Weekly Focus",
  progress_summary:           "Progress Review",
  recommendation_explanation: "Recommendation",
  sustainability_advice:      "Strategy",
  goal_planning:              "Goal Planning",
};

const categoryLabel: Record<string, string> = {
  transport: "Transportation", energy: "Home Energy",
  diet: "Food & Diet", shopping: "Lifestyle",
};

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y:  0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardV: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y:  0, transition: { duration: 0.38, ease: "easeOut" } },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function GroundingBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-white/45">
      {label}
    </span>
  );
}

function SuggestionCard({ q, hint, onClick }: { q: string; hint: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={cardV}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97 }}
      className="w-full rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-left"
      style={{ backdropFilter: "blur(12px)", transition: "border-color 0.2s, background 0.2s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(163,255,176,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(163,255,176,0.06)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
    >
      <span className="block text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--color-signal)" }}>{hint}</span>
      <span className="mt-2 block text-sm font-medium leading-5 text-white/80">{q}</span>
    </motion.button>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-[72%] justify-self-end rounded-[1.25rem] px-5 py-3.5 text-sm font-medium leading-6 text-black"
      style={{ background: "var(--color-signal)" }}
    >
      {content}
    </motion.div>
  );
}

function CoachMessage({ message }: { message: ChatMessage }) {
  const resp = message.response;
  const typeLabel = resp ? (TYPE_LABEL[resp.type] ?? resp.type.replaceAll("_", " ")) : "Response";
  const groundingCount = (resp?.grounding.recommendationCount ?? 0) + (resp?.grounding.progressCount ?? 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-[88%] rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
    >
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ background: "rgba(163,255,176,0.12)", color: "var(--color-signal)" }}
        >
          {typeLabel}
        </span>
        <GroundingBadge label={`Grounded in ${groundingCount} signal${groundingCount !== 1 ? "s" : ""}`} />
        {resp?.grounding.hotspot && (
          <GroundingBadge label={`Hotspot: ${categoryLabel[resp.grounding.hotspot] ?? resp.grounding.hotspot}`} />
        )}
      </div>

      {/* Answer */}
      <p className="mt-5 text-base leading-8 text-white/85">{message.content}</p>

      {/* Footer: model attribution */}
      {resp?.model && (
        <p className="mt-4 text-xs text-white/28">
          via {resp.model} · EarthIQ intelligence stack
        </p>
      )}
    </motion.article>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 px-1"
    >
      <span className="signal-dot" aria-hidden="true" />
      <span className="text-sm text-white/45">EarthIQ is composing a grounded response…</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/30"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachPanelProps {
  result: EarthIqAssessmentResult | null;
  question: string;
  messages: ChatMessage[];
  isCoachThinking: boolean;
  completedActionIds: string[];
  progressSummary: ProgressSummary | null;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestedQuestion: (q: string) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachPanel(props: CoachPanelProps) {
  const { result, messages, progressSummary } = props;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, props.isCoachThinking]);

  const topRec  = result?.recommendations[0];
  const week1   = result?.plan.weeks[0];
  const ctx     = result?.contextProfile;
  const hotspot = result?.hotspot;

  return (
    <section aria-label="EarthIQ Coach">

      {/* ── SECTION 1: Hero ───────────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="hidden" animate="visible"
        className="mb-8"
      >
        <motion.p variants={fadeUp} className="eyebrow">EarthIQ Coach</motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 text-5xl italic leading-[0.96] text-white sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your personal{" "}
          <span style={{ color: "rgba(255,255,255,0.45)" }}>sustainability strategist.</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-base leading-7 text-white/50">
          Built from your carbon profile, goals, recommendations, and progress history.
          Every response is grounded in EarthIQ&apos;s intelligence stack.
        </motion.p>
      </motion.div>

      {/* ── Main two-column layout ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[288px_1fr]">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">

          {/* SECTION 6: Context Awareness */}
          {result ? (
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2">
                <span className="signal-dot" aria-hidden="true" />
                <p className="eyebrow">Your Context</p>
              </div>
              <div className="mt-4 grid gap-2">
                {[
                  { label: "Goal",      value: ctx?.primaryGoal?.replaceAll("_", " ") ?? "—" },
                  { label: "Budget",    value: ctx?.budgetLevel ?? "—" },
                  { label: "Effort",    value: ctx?.effortPreference ?? "—" },
                  { label: "Hotspot",   value: categoryLabel[hotspot?.category ?? ""] ?? hotspot?.category ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <span className="text-xs text-white/38">{label}</span>
                    <span className="text-xs font-medium capitalize text-white/75">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-5">
              <p className="eyebrow">Your Context</p>
              <p className="mt-3 text-xs leading-5 text-white/40">Complete the assessment to unlock your profile context.</p>
            </div>
          )}

          {/* SECTION 7: Weekly Focus */}
          {topRec && week1 && (
            <div className="glass-panel p-5" style={{ borderLeft: "2px solid var(--color-signal)" }}>
              <p className="eyebrow">This Week&apos;s Focus</p>
              <p className="mt-3 text-sm font-medium leading-5 text-white/85">{week1.actions[0]?.action ?? topRec.action}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                  {Math.round(topRec.impact).toLocaleString()} kg
                </span>
                <span className="text-xs text-white/35">potential annual reduction</span>
              </div>
            </div>
          )}

          {/* SECTION 8: Progress Reflection */}
          {progressSummary && (
            <div className="glass-panel p-5">
              <p className="eyebrow">Progress</p>
              <div className="mt-4 grid gap-2">
                {[
                  { label: "Carbon saved",        value: `${Math.round(progressSummary.savedEmissions).toLocaleString()} kg` },
                  { label: "Actions completed",   value: `${progressSummary.completedActions.length}` },
                  { label: "Active streak",        value: `${progressSummary.streakWeeks} week${progressSummary.streakWeeks !== 1 ? "s" : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <span className="text-xs text-white/38">{label}</span>
                    <span className="text-xs font-medium text-white/75">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── RIGHT MAIN WORKSPACE ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* SECTION 2: Suggested Conversations (empty state) */}
          {!hasMessages && (
            <motion.div
              variants={stagger} initial="hidden" animate="visible"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {SUGGESTED.map(({ q, hint }) => (
                <SuggestionCard
                  key={q}
                  q={q}
                  hint={hint}
                  onClick={() => props.onSuggestedQuestion(q)}
                />
              ))}
            </motion.div>
          )}

          {/* SECTION 3-5: Conversation workspace */}
          <div className="glass-panel flex flex-col overflow-hidden" style={{ minHeight: "480px" }}>
            {/* Message area */}
            <div
              className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 sm:p-8"
              aria-live="polite"
              aria-label="EarthIQ coach conversation"
              style={{ maxHeight: "560px" }}
            >
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <span className="signal-dot" aria-hidden="true" />
                  <p className="mt-4 text-sm text-white/40">
                    Select a suggested conversation above, or ask anything.
                  </p>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <UserMessage key={`u-${i}`} content={msg.content} />
                  ) : (
                    <CoachMessage key={`c-${i}`} message={msg} />
                  )
                )}
                {props.isCoachThinking && (
                  <ThinkingIndicator key="thinking" />
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              className="flex gap-3 border-t border-white/8 p-4 sm:p-5"
              onSubmit={(e) => { e.preventDefault(); props.onSubmit(); }}
            >
              <label className="sr-only" htmlFor="coach-question">Ask EarthIQ Coach</label>
              <input
                id="coach-question"
                value={props.question}
                onChange={(e) => props.onQuestionChange(e.target.value)}
                placeholder="Ask your sustainability strategist…"
                className="field-control flex-1"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={props.isCoachThinking || !props.question.trim()}
                className="primary-button shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
