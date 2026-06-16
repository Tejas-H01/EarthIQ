"use client";

import { useEffect, useMemo, useState } from "react";
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

type Screen = "assessment" | "dashboard" | "coach" | "progress" | "audit";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
  response?: CoachResponse;
}

const screens: Array<{ id: Screen; label: string }> = [
  { id: "assessment", label: "Assessment" },
  { id: "dashboard", label: "Carbon Story" },
  { id: "coach", label: "Coach" },
  { id: "progress", label: "Journey" },
  { id: "audit", label: "Audit" },
];

const suggestedQuestions = [
  "Why is this my biggest source?",
  "What should I focus on this week?",
  "What is my cheapest high-impact action?",
  "How much progress have I made?",
];

const assessmentSteps = [
  {
    title: "Transportation",
    eyebrow: "Step 1",
    description: "How far does movement carry your weekly footprint?",
    field: "weeklyTransportKm",
    label: "Weekly distance",
    suffix: "km",
    presets: [40, 120, 260],
  },
  {
    title: "Energy",
    eyebrow: "Step 2",
    description: "Your home energy profile becomes the second signal.",
    field: "monthlyEnergyKwh",
    label: "Monthly electricity",
    suffix: "kWh",
    presets: [160, 320, 620],
  },
  {
    title: "Food",
    eyebrow: "Step 3",
    description: "Diet choices shape a surprisingly personal carbon story.",
    field: "weeklyDietKgCo2e",
    label: "Weekly diet footprint",
    suffix: "kg CO2e",
    presets: [22, 42, 70],
  },
  {
    title: "Lifestyle",
    eyebrow: "Step 4",
    description: "Shopping and replacement habits complete the pattern.",
    field: "monthlyShoppingSpend",
    label: "Monthly lifestyle spend",
    suffix: "units",
    presets: [120, 420, 900],
  },
  {
    title: "Goals",
    eyebrow: "Step 5",
    description: "EarthIQ adapts the decision layer to your constraints.",
    field: "budget",
    label: "Monthly action budget",
    suffix: "units",
    presets: [25, 100, 300],
  },
] as const;

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

  const progressSummary = result
    ? summarizeProgress({
        recommendations: result.recommendations,
        completedActionIds,
      })
    : null;
  const topRecommendation = result?.recommendations[0] ?? null;
  const topSummary = result?.decisionReport.recommendationSummaries[0] ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <CinematicBackdrop />
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
      />

      <section id="earthiq-app" className="relative z-10 px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <nav
            aria-label="EarthIQ sections"
            className="sticky top-3 z-20 mb-10 flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/45 p-2 backdrop-blur-2xl"
          >
            {screens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveScreen(screen.id)}
                className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-medium transition ${
                  activeScreen === screen.id
                    ? "bg-[#A3FFB0] text-black"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {screen.label}
              </button>
            ))}
          </nav>

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
                <MissionControl
                  result={result}
                  topRecommendation={topRecommendation}
                  topSummary={topSummary}
                />
              )}

              {activeScreen === "coach" && (
                <CoachPanel
                  question={question}
                  messages={messages}
                  isCoachThinking={isCoachThinking}
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

              {activeScreen === "audit" && <AuditReport result={result} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

function CinematicBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="stars absolute inset-0" />
      <motion.div
        className="absolute left-1/2 top-[-18rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full border border-[#A3FFB0]/20 bg-[radial-gradient(circle_at_50%_58%,rgba(163,255,176,0.32),rgba(44,117,255,0.14)_34%,rgba(255,255,255,0.04)_52%,transparent_68%)] blur-[1px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#050505]/20 to-[#050505]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,transparent,rgba(5,5,5,0.82)_62%,#050505_100%)]" />
    </div>
  );
}

function Hero(props: { onStart: () => void; onLearn: () => void }) {
  return (
    <section className="relative z-10 flex min-h-screen items-end px-4 pb-16 pt-24 sm:px-6 lg:items-center lg:pb-0">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_420px]"
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
            className="mt-8 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl"
          >
            EarthIQ transforms sustainability data into personalized decisions,
            explainable recommendations, and measurable impact.
          </motion.p>
          <motion.div variants={fadeIn} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={props.onStart}
              className="min-h-12 rounded-full bg-[#A3FFB0] px-6 text-sm font-semibold text-black transition hover:bg-white"
            >
              Start Assessment
            </button>
            <button
              type="button"
              onClick={props.onLearn}
              className="min-h-12 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/10"
            >
              See How It Works
            </button>
          </motion.div>
        </div>
        <motion.div
          variants={fadeIn}
          className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        >
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">
            Live intelligence
          </p>
          <div className="mt-8 grid gap-6">
            <OrbitalStat label="Hotspot detection" value="Carbon story" />
            <OrbitalStat label="Explainability" value="Why this action" />
            <OrbitalStat label="Next step" value="30-day plan" />
          </div>
        </motion.div>
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

function AssessmentExperience(props: {
  form: AssessmentFormState;
  step: number;
  isGenerating: boolean;
  result: EarthIqAssessmentResult | null;
  onStepChange: (step: number) => void;
  onGenerate: () => void;
  onNumberChange: (
    key:
      | "weeklyTransportKm"
      | "monthlyEnergyKwh"
      | "weeklyDietKgCo2e"
      | "monthlyShoppingSpend"
      | "budget",
    value: string,
  ) => void;
  onTextChange: <K extends keyof AssessmentFormState>(
    key: K,
    value: AssessmentFormState[K],
  ) => void;
}) {
  const currentStep = assessmentSteps[props.step];
  const progress = ((props.step + 1) / assessmentSteps.length) * 100;

  return (
    <SectionShell eyebrow="Assessment" title="Begin with a signal, not a spreadsheet.">
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="glass-panel p-5">
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-[#A3FFB0]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <ol className="grid gap-3" aria-label="Assessment progress">
            {assessmentSteps.map((step, index) => (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => props.onStepChange(index)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    props.step === index
                      ? "border-[#A3FFB0]/70 bg-[#A3FFB0]/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-xs uppercase tracking-[0.2em] text-white/45">
                    {step.eyebrow}
                  </span>
                  <span className="mt-1 block text-lg font-medium text-white">
                    {step.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <motion.div
          key={currentStep.title}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="glass-panel min-h-[520px] p-6 sm:p-8"
        >
          <p className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0]">
            {currentStep.eyebrow}
          </p>
          <h3 className="mt-5 font-serif text-5xl italic leading-none text-white sm:text-6xl">
            {currentStep.title}
          </h3>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            {currentStep.description}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {currentStep.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => props.onNumberChange(currentStep.field, String(preset))}
                className={`rounded-3xl border p-5 text-left transition ${
                  props.form[currentStep.field] === preset
                    ? "border-[#A3FFB0] bg-[#A3FFB0]/12"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <span className="font-serif text-4xl italic text-white">
                  {preset}
                </span>
                <span className="mt-2 block text-sm text-white/55">
                  {currentStep.suffix}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr]">
            <label className="grid gap-3 text-sm font-medium text-white/70">
              {currentStep.label}
              <input
                type="number"
                min="0"
                value={props.form[currentStep.field]}
                onChange={(event) =>
                  props.onNumberChange(currentStep.field, event.target.value)
                }
                className="field-control"
              />
            </label>
            {props.step === 4 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-3 text-sm font-medium text-white/70">
                  Primary goal
                  <select
                    value={props.form.primaryGoal}
                    onChange={(event) =>
                      props.onTextChange(
                        "primaryGoal",
                        event.target.value as PrimaryGoal,
                      )
                    }
                    className="field-control"
                  >
                    <option value="save_money">Save money</option>
                    <option value="reduce_emissions">Reduce emissions</option>
                    <option value="low_effort">Keep effort low</option>
                  </select>
                </label>
                <label className="grid gap-3 text-sm font-medium text-white/70">
                  Effort
                  <select
                    value={props.form.effortPreference}
                    onChange={(event) =>
                      props.onTextChange(
                        "effortPreference",
                        event.target.value as EffortPreference,
                      )
                    }
                    className="field-control"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => props.onStepChange(Math.max(0, props.step - 1))}
              className="secondary-button"
            >
              Previous
            </button>
            {props.step < assessmentSteps.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  props.onStepChange(
                    Math.min(assessmentSteps.length - 1, props.step + 1),
                  )
                }
                className="primary-button"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={props.onGenerate}
                disabled={props.isGenerating}
                className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {props.isGenerating ? "Reading your signals" : "Generate EarthIQ story"}
              </button>
            )}
          </div>

          {props.result && (
            <p className="mt-6 text-sm text-[#A3FFB0]">
              Your assessment is ready. Open Carbon Story to see what EarthIQ found.
            </p>
          )}
        </motion.div>
      </div>
    </SectionShell>
  );
}

function MissionControl(props: {
  result: EarthIqAssessmentResult | null;
  topRecommendation: EarthIqAssessmentResult["recommendations"][number] | null;
  topSummary: EarthIqAssessmentResult["decisionReport"]["recommendationSummaries"][number] | null;
}) {
  if (!props.result) {
    return <EmptyState label="Start the assessment to reveal your carbon story." />;
  }

  return (
    <SectionShell eyebrow="Your Carbon Story" title="The shape of your impact is now visible.">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <StoryCard
          label="Total emissions"
          value={formatKg(props.result.carbonBreakdown.total)}
          narrative="Your annual footprint becomes the baseline EarthIQ uses to choose practical, explainable next steps."
        />
        <div className="grid gap-5">
          <StoryCard
            label="Biggest source"
            value={props.result.hotspot.category}
            narrative={`${props.result.hotspot.percentageContribution}% of your footprint concentrates here.`}
          />
          <StoryCard
            label="Potential reduction"
            value={formatKg(props.result.decisionReport.projectedReduction)}
            narrative="This is the annual reduction from the highest-ranked action EarthIQ selected."
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <StoryCard
          label="Top recommendation"
          value={props.topRecommendation?.action ?? "No action available"}
          narrative={props.topRecommendation?.explanation ?? "Generate recommendations to see a next step."}
        />
        <ExplainabilityCard result={props.result} summary={props.topSummary} />
      </div>
    </SectionShell>
  );
}

function ExplainabilityCard(props: {
  result: EarthIqAssessmentResult;
  summary: EarthIqAssessmentResult["decisionReport"]["recommendationSummaries"][number] | null;
}) {
  const suitability = props.summary?.explanation.suitability;
  const blocks = [
    {
      title: "Hotspot source",
      text: `${props.result.hotspot.category} is the leading source at ${props.result.hotspot.percentageContribution}%.`,
    },
    {
      title: "Goal alignment",
      text: suitability?.goalAligned
        ? `Aligned with your goal to ${formatGoal(props.result.contextProfile.primaryGoal)}.`
        : "Less aligned with your primary goal.",
    },
    {
      title: "Budget alignment",
      text: suitability?.budgetCompatible
        ? `Fits your ${props.result.contextProfile.budgetLevel} budget context.`
        : "May exceed your current budget context.",
    },
    {
      title: "Effort alignment",
      text: suitability?.effortCompatible
        ? `Matches your ${props.result.contextProfile.effortPreference} effort preference.`
        : "Requires more effort than your selected preference.",
    },
    {
      title: "Projected impact",
      text: `${formatKg(props.summary?.impact ?? 0)} CO2e annual reduction.`,
    },
  ];

  return (
    <article className="glass-panel p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0]">
        Why EarthIQ chose this
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h4 className="font-serif text-2xl italic text-white">{block.title}</h4>
            <p className="mt-2 text-sm leading-6 text-white/65">{block.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CoachPanel(props: {
  question: string;
  messages: ChatMessage[];
  isCoachThinking: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestedQuestion: (question: string) => void;
}) {
  return (
    <SectionShell eyebrow="EarthIQ Coach" title="A calmer way to ask what comes next.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="glass-panel p-5">
          <p className="text-sm leading-6 text-white/65">
            Suggested prompts are grounded in EarthIQ reasoning, not a generic
            chat script.
          </p>
          <div className="mt-5 grid gap-3">
            {suggestedQuestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => props.onSuggestedQuestion(suggestion)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-medium text-white/80 transition hover:border-[#A3FFB0]/50 hover:bg-[#A3FFB0]/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </aside>

        <section className="glass-panel grid min-h-[560px] grid-rows-[1fr_auto] overflow-hidden">
          <div
            className="grid content-start gap-4 p-5 sm:p-6"
            aria-live="polite"
            aria-label="EarthIQ coach conversation"
          >
            {props.messages.length === 0 && (
              <CoachResponseCard
                title="Ready when you are"
                body="Ask about the why behind your hotspot, the cheapest high-impact action, or how your progress changes the story."
                responseType="Weekly Focus"
              />
            )}
            {props.messages.map((message, index) =>
              message.role === "user" ? (
                <div
                  key={`${message.role}-${index}`}
                  className="max-w-2xl justify-self-end rounded-3xl bg-[#A3FFB0] px-5 py-4 text-sm font-medium leading-6 text-black"
                >
                  {message.content}
                </div>
              ) : (
                <CoachResponseCard
                  key={`${message.role}-${index}`}
                  title="Coach response"
                  body={message.content}
                  responseType={message.response?.type.replaceAll("_", " ") ?? "Advice"}
                />
              ),
            )}
            {props.isCoachThinking && (
              <p className="text-sm text-white/55">EarthIQ Coach is composing a grounded response.</p>
            )}
          </div>
          <form
            className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmit();
            }}
          >
            <label className="sr-only" htmlFor="coach-question">
              Ask EarthIQ Coach
            </label>
            <input
              id="coach-question"
              value={props.question}
              onChange={(event) => props.onQuestionChange(event.target.value)}
              placeholder="Ask what to focus on next"
              className="field-control"
            />
            <button type="submit" className="primary-button">
              Ask Coach
            </button>
          </form>
        </section>
      </div>
    </SectionShell>
  );
}

function CoachResponseCard(props: {
  title: string;
  body: string;
  responseType: string;
}) {
  return (
    <article className="max-w-3xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#A3FFB0]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#A3FFB0]">
          {props.responseType}
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
          Confidence: grounded
        </span>
      </div>
      <h3 className="mt-5 font-serif text-3xl italic text-white">{props.title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/70">{props.body}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60">
          Reasoning summary: based on hotspot, goals, budget, and progress signals.
        </p>
        <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60">
          Action recommendation: keep the next step small enough to complete.
        </p>
      </div>
    </article>
  );
}

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

function AuditReport(props: { result: EarthIqAssessmentResult | null }) {
  if (!props.result) {
    return <EmptyState label="Generate an assessment to unlock the audit report." />;
  }

  const best = props.result.decisionReport.bestAction;

  return (
    <SectionShell eyebrow="EarthIQ Sustainability Audit" title="A wrapped-style record of where you are, and where to go next.">
      <div className="grid gap-5">
        <WrappedSection index="01" title="Current Impact" value={formatKg(props.result.decisionReport.totalEmissions)} text="This is your annual emissions baseline." />
        <WrappedSection index="02" title="Biggest Opportunity" value={props.result.hotspot.category} text={`${props.result.hotspot.percentageContribution}% of emissions concentrate here.`} />
        <WrappedSection index="03" title="Recommended Action" value={best?.action ?? "No action"} text="EarthIQ selected this after ranking impact, budget, effort, and goal alignment." />
        <WrappedSection index="04" title="Potential Savings" value={formatKg(props.result.decisionReport.projectedReduction)} text="Projected annual reduction from your top-ranked action." />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <article className="glass-panel p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0]">30-day plan</p>
          <div className="mt-6 grid gap-3">
            {props.result.plan.weeks.map((week) => (
              <div key={week.week} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                <h4 className="font-serif text-2xl italic text-white">Week {week.week}</h4>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {week.actions[0]?.action ?? "Review progress and prepare the next action."}
                </p>
              </div>
            ))}
          </div>
        </article>
        <article className="glass-panel p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0]">AI Summary</p>
          <h3 className="mt-5 font-serif text-4xl italic text-white">Your next chapter is specific.</h3>
          <div className="mt-6 grid gap-3">
            {props.result.decisionReport.keyInsights.map((insight) => (
              <p key={insight} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/65">
                {insight}
              </p>
            ))}
          </div>
        </article>
      </div>
    </SectionShell>
  );
}

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

function StoryCard(props: { label: string; value: string; narrative: string }) {
  return (
    <article className="glass-panel p-6 sm:p-8">
      <p className="text-sm uppercase tracking-[0.24em] text-white/45">{props.label}</p>
      <p className="mt-6 font-serif text-5xl italic leading-none text-white sm:text-6xl">
        {props.value}
      </p>
      <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">{props.narrative}</p>
    </article>
  );
}

function JourneyCard(props: { label: string; value: string }) {
  return (
    <article className="glass-panel p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-white/45">{props.label}</p>
      <p className="mt-4 font-serif text-5xl italic text-white">{props.value}</p>
    </article>
  );
}

function WrappedSection(props: {
  index: string;
  title: string;
  value: string;
  text: string;
}) {
  return (
    <article className="glass-panel grid gap-5 p-6 sm:grid-cols-[90px_1fr] sm:p-8">
      <p className="font-serif text-5xl italic text-[#A3FFB0]">{props.index}</p>
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-white/45">{props.title}</p>
        <h3 className="mt-4 font-serif text-4xl italic leading-tight text-white sm:text-5xl">
          {props.value}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{props.text}</p>
      </div>
    </article>
  );
}

function EmptyState(props: { label: string }) {
  return (
    <section className="py-12">
      <div className="glass-panel p-8 text-white/65">{props.label}</div>
    </section>
  );
}
