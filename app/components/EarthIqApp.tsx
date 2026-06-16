"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EarthIqApplicationService,
  askCoach,
  getDefaultAssessmentForm,
  summarizeProgress,
  type AssessmentFormState,
  type EarthIqAssessmentResult,
} from "@/application";
import type { CoachResponse, EffortPreference, PrimaryGoal } from "@/types";
import { CinematicBackdrop, ChapterNav } from "./layout";
import { EmptyState } from "./ui";
import { AssessmentExperience, GeneratingOverlay } from "./assessment";
import { MissionControl } from "./mission-control";
import { CoachPanel } from "./coach";
import { AuditReport } from "./audit";

type Screen = "assessment" | "dashboard" | "coach" | "progress" | "audit";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
  response?: CoachResponse;
}

// Chapter definitions live in ChapterNav component


// assessmentSteps moved to app/components/assessment/AssessmentExperience.tsx

const fadeIn = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// ─── Demo fixture ────────────────────────────────────────────────────────────

const DEMO_FORM: AssessmentFormState = {
  name:                 "Demo User",
  profileType:          "household",
  weeklyTransportKm:    120,
  monthlyEnergyKwh:     320,
  weeklyDietKgCo2e:      42,
  monthlyShoppingSpend: 420,
  budget:               100,
  primaryGoal:          "reduce_emissions",
  effortPreference:     "medium",
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString()}kg`;
}

function formatGoal(goal: PrimaryGoal): string {
  return goal.replaceAll("_", " ");
}

function updateNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function EarthIqApp() {
  const applicationService = useMemo(() => new EarthIqApplicationService(), []);
  const [activeScreen, setActiveScreen] = useState<Screen>("assessment");
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [form, setForm] = useState<AssessmentFormState>(
    getDefaultAssessmentForm(),
  );
  const [result, setResult] = useState<EarthIqAssessmentResult | null>(null);
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  useEffect(() => {
    void generateAssessment(getDefaultAssessmentForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateAssessment(nextForm = form) {
    setIsGenerating(true);
    const generated = await applicationService.generateAssessment(nextForm);
    setResult(generated);
    setCompletedActionIds([]);
    setMessages([]);
    setIsGenerating(false);
  }

  function handleDemo() {
    setForm(DEMO_FORM);
    setAssessmentStep(0);
    void generateAssessment(DEMO_FORM);
    document.getElementById("earthiq-app")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setField<K extends keyof AssessmentFormState>(
    key: K,
    value: AssessmentFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submitCoachQuestion(nextQuestion = question) {
    if (!result || nextQuestion.trim().length === 0) {
      return;
    }

    setQuestion("");
    setIsCoachThinking(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: nextQuestion },
    ]);
    const response = await askCoach({
      question: nextQuestion,
      result,
      completedActionIds,
    });
    setMessages((current) => [
      ...current,
      { role: "coach", content: response.answer, response },
    ]);
    setIsCoachThinking(false);
  }

  const wasGenerating = useRef(false);

  // Auto-navigate to Carbon Story when generation completes
  useEffect(() => {
    if (wasGenerating.current && !isGenerating && result) {
      const timer = setTimeout(() => setActiveScreen("dashboard"), 350);
      return () => clearTimeout(timer);
    }
    wasGenerating.current = isGenerating;
  });

  const progressSummary = result
    ? summarizeProgress({
        recommendations: result.recommendations,
        completedActionIds,
      })
    : null;


  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <CinematicBackdrop />

      {/* Generation overlay — rendered above everything */}
      <AnimatePresence>
        {isGenerating && <GeneratingOverlay />}
      </AnimatePresence>
      <Hero
        onStart={() => {
          setActiveScreen("assessment");
          document
            .getElementById("earthiq-app")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onLearn={() => {
          setActiveScreen("dashboard");
          document
            .getElementById("earthiq-app")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onDemo={handleDemo}
      />

      <section id="earthiq-app" className="relative z-10 px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ChapterNav
            activeScreen={activeScreen}
            hasResult={result !== null}
            onNavigate={(screen) => setActiveScreen(screen)}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {activeScreen === "assessment" && (
                <AssessmentExperience
                  form={form}
                  step={assessmentStep}
                  isGenerating={isGenerating}
                  result={result}
                  onStepChange={setAssessmentStep}
                  onGenerate={() => void generateAssessment()}
                  onNumberChange={(key, value) =>
                    setField(key, updateNumber(value, Number(form[key])))
                  }
                  onTextChange={setField}
                />
              )}

              {activeScreen === "dashboard" && (
                <MissionControl result={result} />
              )}

              {activeScreen === "coach" && (
                <CoachPanel
                  result={result}
                  question={question}
                  messages={messages}
                  isCoachThinking={isCoachThinking}
                  completedActionIds={completedActionIds}
                  progressSummary={progressSummary}
                  onQuestionChange={setQuestion}
                  onSubmit={() => void submitCoachQuestion()}
                  onSuggestedQuestion={(nextQuestion) =>
                    void submitCoachQuestion(nextQuestion)
                  }
                />
              )}

              {activeScreen === "progress" && (
                <ProgressExperience
                  result={result}
                  completedActionIds={completedActionIds}
                  progressSummary={progressSummary}
                  onToggleAction={(actionId) =>
                    setCompletedActionIds((current) =>
                      current.includes(actionId)
                        ? current.filter((id) => id !== actionId)
                        : [...current, actionId],
                    )
                  }
                />
              )}

              {activeScreen === "audit" && (
                <AuditReport result={result} progressSummary={progressSummary} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

// CinematicBackdrop extracted to app/components/layout/CinematicBackdrop.tsx

function Hero(props: { onStart: () => void; onLearn: () => void; onDemo: () => void }) {
  return (
    <section className="relative z-10 flex min-h-screen items-end px-4 pb-16 pt-24 sm:px-6 lg:items-center lg:pb-0"
      aria-label="EarthIQ — Intelligent Climate Companion">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_400px]"
      >
        <div className="max-w-4xl">
          <motion.p
            variants={fadeIn}
            className="mb-6 text-sm font-medium uppercase tracking-[0.28em] text-[#A3FFB0]"
          >
            Intelligent climate companion
          </motion.p>
          <motion.h1
            variants={fadeIn}
            className="font-serif text-6xl italic leading-[0.9] tracking-normal text-white sm:text-7xl lg:text-8xl"
          >
            Understand Your
            <span className="block text-white/80">Impact on Earth</span>
          </motion.h1>
          <motion.p
            variants={fadeIn}
            className="mt-8 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl"
          >
            EarthIQ transforms sustainability data into personalized decisions,
            explainable recommendations, and measurable impact — powered by Google Gemini.
          </motion.p>
          <motion.div variants={fadeIn} className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={props.onStart}
              className="min-h-12 rounded-full bg-[#A3FFB0] px-7 text-sm font-semibold text-black transition-all duration-200 hover:bg-white hover:scale-[1.02] focus-visible:outline-2"
            >
              Start Assessment
            </button>
            <button
              type="button"
              onClick={props.onDemo}
              className="min-h-12 rounded-full border border-[#ffb830]/40 bg-[#ffb830]/10 px-7 text-sm font-semibold text-[#ffb830] backdrop-blur-xl transition-all duration-200 hover:bg-[#ffb830]/20 hover:border-[#ffb830]/70 focus-visible:outline-2"
            >
              ⚡ Try Demo
            </button>
            <button
              type="button"
              onClick={props.onLearn}
              className="min-h-12 rounded-full border border-white/15 bg-white/[0.04] px-7 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/10 focus-visible:outline-2"
            >
              See How It Works
            </button>
          </motion.div>
          <motion.p variants={fadeIn} className="mt-6 text-xs text-white/30">
            Demo loads a realistic sample profile instantly using real EarthIQ engines.
          </motion.p>
        </div>
        <motion.aside
          variants={fadeIn}
          className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
          aria-label="EarthIQ capabilities"
        >
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">
            What EarthIQ does
          </p>
          <div className="mt-8 grid gap-6">
            <OrbitalStat label="Hotspot detection" value="Carbon story" />
            <OrbitalStat label="Explainability layer" value="Why this action" />
            <OrbitalStat label="30-day movement" value="Personalised plan" />
            <OrbitalStat label="AI coach" value="Instant answers" />
            <OrbitalStat label="Confidence" value="Grounded reasoning" />
          </div>
        </motion.aside>
      </motion.div>
    </section>
  );
}

function OrbitalStat(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
      <span className="text-sm text-white/55">{props.label}</span>
      <span className="font-serif text-2xl italic text-white">{props.value}</span>
    </div>
  );
}

// AssessmentExperience extracted to app/components/assessment/AssessmentExperience.tsx

// MissionControl extracted to app/components/mission-control/MissionControl.tsx

// CoachPanel extracted to app/components/coach/CoachPanel.tsx

function ProgressExperience(props: {
  result: EarthIqAssessmentResult | null;
  completedActionIds: string[];
  progressSummary: ReturnType<typeof summarizeProgress> | null;
  onToggleAction: (actionId: string) => void;
}) {
  if (!props.result || !props.progressSummary) {
    return <EmptyState label="Start an assessment to begin your impact journey." />;
  }

  const planActions = props.result.plan.weeks.flatMap((week) => week.actions);
  const completion = planActions.length
    ? (props.completedActionIds.length / planActions.length) * 100
    : 0;

  return (
    <SectionShell eyebrow="Impact Journey" title={`You have prevented ${formatKg(props.progressSummary.savedEmissions)} of CO2e emissions.`}>
      <div className="grid gap-5 md:grid-cols-3">
        <JourneyCard label="Carbon saved" value={formatKg(props.progressSummary.savedEmissions)} />
        <JourneyCard label="Completed actions" value={`${props.progressSummary.completedActions.length}`} />
        <JourneyCard
          label="Streak"
          value={`${props.progressSummary.streakWeeks} week${props.progressSummary.streakWeeks === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mt-6 glass-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0]">
              Active plan
            </p>
            <h3 className="mt-2 font-serif text-4xl italic text-white">30-day movement</h3>
          </div>
          <p className="text-sm text-white/55">{Math.round(completion)}% complete</p>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[#A3FFB0]"
            animate={{ width: `${completion}%` }}
          />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {props.result.plan.weeks.map((week) => (
            <article key={week.week} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <h4 className="font-serif text-3xl italic text-white">Week {week.week}</h4>
              <div className="mt-4 grid gap-3">
                {week.actions.length === 0 ? (
                  <p className="text-sm text-white/60">Reflect and prepare the next step.</p>
                ) : (
                  week.actions.map((action) => (
                    <label key={action.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={props.completedActionIds.includes(action.id)}
                        onChange={() => props.onToggleAction(action.id)}
                        className="mt-1 size-4 accent-[#A3FFB0]"
                      />
                      <span>
                        <span className="block font-medium text-white">{action.action}</span>
                        <span className="mt-1 block text-white/50">
                          {formatKg(action.impact)} annual reduction
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

// AuditReport extracted to app/components/audit/AuditReport.tsx

function SectionShell(props: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="py-8"
    >
      <motion.p
        variants={fadeIn}
        className="text-sm font-medium uppercase tracking-[0.28em] text-[#A3FFB0]"
      >
        {props.eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeIn}
        className="mt-5 max-w-5xl font-serif text-5xl italic leading-[0.98] text-white sm:text-6xl lg:text-7xl"
      >
        {props.title}
      </motion.h2>
      <motion.div variants={fadeIn} className="mt-10">
        {props.children}
      </motion.div>
    </motion.section>
  );
}

// StoryCard removed — replaced by MissionControl sections

function JourneyCard(props: { label: string; value: string }) {
  return (
    <article className="glass-panel p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-white/45">{props.label}</p>
      <p className="mt-4 font-serif text-5xl italic text-white">{props.value}</p>
    </article>
  );
}

// WrappedSection removed — AuditReport extracted to app/components/audit/

// EmptyState extracted to app/components/ui/EmptyState.tsx
