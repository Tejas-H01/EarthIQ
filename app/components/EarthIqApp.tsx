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
import { EmptyState, AuthModal, Button, GlassPanel } from "./ui";
import { AssessmentExperience, GeneratingOverlay } from "./assessment";
import { MissionControl } from "./mission-control";
import { CoachPanel } from "./coach";
import { AuditReport } from "./audit";
import { createSupabaseBrowserClient, type AssessmentRow, type PlanRow } from "@/lib/supabase";
import { createPersistenceService } from "@/services";
import type { User } from "@supabase/supabase-js";
import type { FourWeekSustainabilityPlan, RankedRecommendation, ContextProfile, CarbonCalculationResult } from "@/types";

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

  // Auth & Persistence States
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRow[]>([]);
  const [planHistory, setPlanHistory] = useState<PlanRow[]>([]);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeStats, setWelcomeStats] = useState<{
    daysAgo: number;
    currentFootprint: number;
    trendPercent: number;
    trendDirection: "up" | "down" | "flat";
    primaryFocus: string;
  } | null>(null);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (e) {
      console.warn("Supabase not configured, running in local-only Guest Mode:", e);
      return null;
    }
  }, []);

  const persistenceService = useMemo(() => {
    if (!supabase) return null;
    return createPersistenceService(supabase);
  }, [supabase]);

  function calculateWelcomeStats(history: AssessmentRow[]) {
    if (history.length === 0) return null;
    const latest = history[0];
    const createdDate = new Date(latest.created_at);
    const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
    const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const latestBreakdown = latest.carbon_breakdown as any;
    const currentFootprint = Number(latestBreakdown?.total || 0).toFixed(1);

    let trendPercent = 0;
    let trendDirection: "up" | "down" | "flat" = "flat";
    if (history.length > 1) {
      const prev = history[1];
      const prevBreakdown = prev.carbon_breakdown as any;
      const prevTotal = Number(prevBreakdown?.total || 0);
      const currTotal = Number(latestBreakdown?.total || 0);
      if (prevTotal > 0) {
        const diff = currTotal - prevTotal;
        trendPercent = Math.round((Math.abs(diff) / prevTotal) * 100);
        if (diff < 0) {
          trendDirection = "down";
        } else if (diff > 0) {
          trendDirection = "up";
        }
      }
    }

    const latestHotspot = latest.hotspot as any;
    const primaryFocus = latestHotspot?.category
      ? latestHotspot.category.charAt(0).toUpperCase() + latestHotspot.category.slice(1)
      : "General";

    return {
      daysAgo,
      currentFootprint: Number(currentFootprint),
      trendPercent,
      trendDirection,
      primaryFocus,
    };
  }

  async function loadUserData(userId: string) {
    if (!persistenceService) return;
    try {
      const history = await persistenceService.loadAssessmentHistory(userId);
      setAssessmentHistory(history);

      const latest = history[0] || null;
      if (latest) {
        const carbonBreakdown = latest.carbon_breakdown as any;
        const contextProfile = latest.context_profile as any;
        const hotspot = latest.hotspot as any;

        const recs = await persistenceService.loadRecommendations({
          userId,
          assessmentId: latest.id,
        });
        const latestRecs = recs[0]?.recommendations as any[] || [];

        const planRow = await persistenceService.loadPlan({ userId });
        const latestPlan = planRow?.plan as any || null;
        if (planRow) {
          setLoadedPlanId(planRow.id);
        }

        const progressRows = await persistenceService.loadProgress({
          userId,
          planId: planRow?.id,
        });
        const completedIds = progressRows
          .filter((p) => p.status === "completed")
          .map((p) => p.action_id);
        setCompletedActionIds(completedIds);

        const plansList = await persistenceService.loadPlanHistory(userId);
        setPlanHistory(plansList);

        const assessmentResult = applicationService.rebuildAssessmentResult({
          userProfile: {
            budget: contextProfile.budget,
            primaryGoal: contextProfile.primaryGoal,
            effortPreference: contextProfile.effortPreference,
          },
          contextProfile,
          carbonBreakdown,
          hotspot,
          recommendations: latestRecs,
          plan: latestPlan,
          completedActionIds: completedIds,
        });

        setResult(assessmentResult);

        const stats = calculateWelcomeStats(history);
        if (stats) {
          setWelcomeStats(stats);
          setShowWelcomeBack(true);
        }
      } else {
        setResult(null);
        setCompletedActionIds([]);
        setAssessmentHistory([]);
        setPlanHistory([]);
        setLoadedPlanId(null);
      }
    } catch (e) {
      console.error("Failed to load user data from Supabase:", e);
    } finally {
      setSessionChecked(true);
    }
  }

  function loadGuestData() {
    try {
      const savedResult = localStorage.getItem("earthiq_guest_result");
      const savedCompleted = localStorage.getItem("earthiq_guest_completed_actions");

      if (savedResult) {
        setResult(JSON.parse(savedResult));
      } else {
        setResult(null);
      }

      if (savedCompleted) {
        setCompletedActionIds(JSON.parse(savedCompleted));
      } else {
        setCompletedActionIds([]);
      }
      setAssessmentHistory([]);
      setPlanHistory([]);
      setLoadedPlanId(null);
    } catch (e) {
      console.warn("localStorage not available:", e);
      setResult(null);
      setCompletedActionIds([]);
    }
  }

  useEffect(() => {
    if (!supabase) {
      loadGuestData();
      setSessionChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        void loadUserData(session.user.id);
      } else {
        loadGuestData();
        setSessionChecked(true);
      }
    }).catch((err) => {
      console.warn("Failed to get session:", err);
      loadGuestData();
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadUserData(session.user.id);
      } else {
        loadGuestData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleLogout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      loadGuestData();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }

  async function generateAssessment(nextForm = form) {
    setIsGenerating(true);
    const generated = await applicationService.generateAssessment(nextForm);
    setResult(generated);
    setCompletedActionIds([]);
    setMessages([]);
    setIsGenerating(false);

    if (user && persistenceService) {
      try {
        const dbAssessment = await persistenceService.saveAssessment({
          userId: user.id,
          carbonBreakdown: generated.carbonBreakdown,
          contextProfile: generated.contextProfile,
          hotspot: generated.hotspot,
        });
        const dbRecommendations = await persistenceService.saveRecommendations({
          userId: user.id,
          assessmentId: dbAssessment.id,
          recommendations: generated.recommendations,
        });
        const dbPlan = await persistenceService.savePlan({
          userId: user.id,
          recommendationSetId: dbRecommendations.id,
          plan: generated.plan,
        });
        setLoadedPlanId(dbPlan.id);

        const historyList = await persistenceService.loadAssessmentHistory(user.id);
        setAssessmentHistory(historyList);
        const plansList = await persistenceService.loadPlanHistory(user.id);
        setPlanHistory(plansList);
      } catch (e) {
        console.error("Failed to persist assessment to Supabase:", e);
      }
    } else {
      try {
        localStorage.setItem("earthiq_guest_result", JSON.stringify(generated));
        localStorage.setItem("earthiq_guest_completed_actions", JSON.stringify([]));
      } catch (e) {
        console.warn("localStorage not available:", e);
      }
    }
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
      const timer = setTimeout(() => {
        setActiveScreen("dashboard");
      }, 350);
      wasGenerating.current = false;
      return () => clearTimeout(timer);
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating, result]);

  const progressSummary = result
    ? summarizeProgress({
        recommendations: result.recommendations,
        completedActionIds,
      })
    : null;



  const navigateToAssessmentAction = (
    <Button onClick={() => setActiveScreen("assessment")} variant="primary">
      Take Assessment
    </Button>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <CinematicBackdrop />

      {/* Global Header Bar */}
      <header className="relative z-20 border-b border-white/5 bg-[#050505]/45 backdrop-blur-xl px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🌍</span>
            <div>
              <span className="block text-lg font-bold tracking-wider text-white">EarthIQ</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#A3FFB0]">
                Explainable Climate Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-white">{user.email}</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#A3FFB0]">Member</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-[#A3FFB0]/20 bg-[#A3FFB0]/10 flex items-center justify-center text-sm font-bold text-[#A3FFB0]" aria-hidden="true">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-white/45 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-white/30 hidden sm:inline">Guest Mode</span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold tracking-wider text-white transition-all"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Returning User Welcome Back Experience Overlay */}
      <AnimatePresence>
        {showWelcomeBack && welcomeStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <GlassPanel elevated className="relative p-8 overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl text-center">
                <div className="mb-6">
                  <span className="text-4xl block mb-3 animate-pulse" aria-hidden="true">🌱</span>
                  <h2 className="text-2xl font-bold tracking-wider text-white">Welcome Back</h2>
                  <p className="text-[#A3FFB0] text-xs uppercase tracking-widest mt-1">
                    Your Carbon Journey Continues
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 my-8">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="block text-[10px] uppercase tracking-wider text-white/45 mb-1 font-medium">Last Assessment</span>
                    <span className="text-lg font-bold text-white">{welcomeStats.daysAgo} Days Ago</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="block text-[10px] uppercase tracking-wider text-white/45 mb-1 font-medium">Current Footprint</span>
                    <span className="text-lg font-bold text-white">{welcomeStats.currentFootprint} tCO₂e</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="block text-[10px] uppercase tracking-wider text-white/45 mb-1 font-medium">Carbon Trend</span>
                    <span className={`text-lg font-bold ${welcomeStats.trendDirection === "down" ? "text-emerald-400" : welcomeStats.trendDirection === "up" ? "text-rose-400" : "text-white"}`}>
                      {welcomeStats.trendDirection === "down" ? `↓ ${welcomeStats.trendPercent}%` : welcomeStats.trendDirection === "up" ? `↑ ${welcomeStats.trendPercent}%` : "—"}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="block text-[10px] uppercase tracking-wider text-white/45 mb-1 font-medium">Primary Focus</span>
                    <span className="text-lg font-bold text-white">{welcomeStats.primaryFocus}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowWelcomeBack(false)}
                  className="w-full min-h-12 text-sm tracking-wider font-semibold rounded-xl"
                >
                  Continue to Dashboard
                </Button>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal popup */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            supabase={supabase}
            onAuthSuccess={(u) => {
              setUser(u);
              setShowAuthModal(false);
            }}
            onContinueGuest={() => {
              setShowAuthModal(false);
              loadGuestData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Generation overlay — rendered above everything */}
      <AnimatePresence>
        {isGenerating && <GeneratingOverlay />}
      </AnimatePresence>
      <Hero
        onStart={() => {
          setActiveScreen("assessment");
          setTimeout(() => {
            document
              .getElementById("earthiq-app")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        }}
        onLearn={() => {
          setActiveScreen("dashboard");
          setTimeout(() => {
            document
              .getElementById("earthiq-app")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        }}
        onDemo={handleDemo}
      />

      <section id="earthiq-app" className="relative z-10 px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ChapterNav
            activeScreen={activeScreen}
            hasResult={result !== null}
            onNavigate={(screen) => {
              setActiveScreen(screen);
              setTimeout(() => {
                document
                  .getElementById("earthiq-app")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
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
                result ? (
                  <MissionControl result={result} />
                ) : (
                  <EmptyState
                    label="Carbon Story Locked"
                    description="Complete your first assessment to unlock your carbon breakdown."
                    action={navigateToAssessmentAction}
                  />
                )
              )}

              {activeScreen === "coach" && (
                result ? (
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
                ) : (
                  <EmptyState
                    label="Personalised Coach Locked"
                    description="Complete your first assessment to unlock personalized coaching."
                    action={navigateToAssessmentAction}
                  />
                )
              )}

              {activeScreen === "progress" && (
                result ? (
                  <ProgressExperience
                    result={result}
                    completedActionIds={completedActionIds}
                    progressSummary={progressSummary}
                    onToggleAction={(actionId) => {
                      const nextActionIds = completedActionIds.includes(actionId)
                        ? completedActionIds.filter((id) => id !== actionId)
                        : [...completedActionIds, actionId];
                      
                      setCompletedActionIds(nextActionIds);

                      if (user && persistenceService) {
                        const status = nextActionIds.includes(actionId) ? "completed" : "in_progress";
                        void persistenceService.updateProgress({
                          userId: user.id,
                          planId: loadedPlanId || null,
                          actionId,
                          status,
                          completedAt: status === "completed" ? new Date().toISOString() : null,
                        });
                      } else {
                        try {
                          localStorage.setItem("earthiq_guest_completed_actions", JSON.stringify(nextActionIds));
                        } catch (e) {
                          console.warn("localStorage not available:", e);
                        }
                      }
                    }}
                    assessmentHistory={assessmentHistory}
                    planHistory={planHistory}
                  />
                ) : (
                  <EmptyState
                    label="Sustainability Journey Locked"
                    description="Your sustainability journey begins with your first assessment."
                    action={navigateToAssessmentAction}
                  />
                )
              )}

              {activeScreen === "audit" && (
                result ? (
                  <AuditReport result={result} progressSummary={progressSummary} />
                ) : (
                  <EmptyState
                    label="Explainable Audit Locked"
                    description="Generate your first EarthIQ report."
                    action={navigateToAssessmentAction}
                  />
                )
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
          <motion.div variants={fadeIn} className="mb-6">
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-white/40 block mb-2">EARTHIQ</span>
            <span className="text-sm font-medium uppercase tracking-[0.28em] text-[#A3FFB0] block">Intelligent Climate Companion</span>
          </motion.div>
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
  assessmentHistory: AssessmentRow[];
  planHistory: PlanRow[];
}) {
  if (!props.result || !props.progressSummary) {
    return <EmptyState label="Start an assessment to begin your impact journey." />;
  }

  const planActions = props.result.plan.weeks.flatMap((week) => week.actions);
  const completion = planActions.length
    ? (props.completedActionIds.length / planActions.length) * 100
    : 0;

  // Build trend data
  const footprintTrend = props.assessmentHistory
    .map((row) => {
      const breakdown = row.carbon_breakdown as any;
      return {
        date: new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        total: Number(breakdown?.total || 0),
      };
    })
    .reverse();

  const maxFootprint = footprintTrend.length
    ? Math.max(...footprintTrend.map((t) => t.total))
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

      {/* Carbon Trend Chart (rendered when history exists) */}
      {footprintTrend.length > 1 && (
        <div className="mt-8 glass-panel p-6">
          <h3 className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0] mb-6">Carbon Footprint Trend</h3>
          <div className="flex items-end justify-around h-36 gap-2 pt-4 border-b border-white/10">
            {footprintTrend.map((data, idx) => {
              const heightPercent = maxFootprint ? (data.total / maxFootprint) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 max-w-[60px]">
                  <span className="text-[10px] text-white/50 mb-1.5">{data.total.toFixed(1)}t</span>
                  <div className="w-full bg-[#A3FFB0]/20 rounded-t-lg overflow-hidden flex items-end" style={{ height: "80px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="w-full bg-gradient-to-t from-[#A3FFB0]/40 to-[#A3FFB0]"
                    />
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-white/40 mt-2 whitespace-nowrap">{data.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assessment History Timeline */}
      {props.assessmentHistory.length > 0 && (
        <div className="mt-8 glass-panel p-6">
          <h3 className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0] mb-6">Assessment History</h3>
          <div className="relative border-l border-white/10 pl-6 ml-3 space-y-8">
            {props.assessmentHistory.map((row, idx) => {
              const breakdown = row.carbon_breakdown as any;
              const hotspot = row.hotspot as any;
              const formattedDate = new Date(row.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });
              const total = Number(breakdown?.total || 0).toFixed(1);

              return (
                <div key={row.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#A3FFB0] bg-[#050505] flex items-center justify-center">
                    {idx === 0 && <span className="w-1 h-1 rounded-full bg-[#A3FFB0]" />}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-white/30">{formattedDate}</span>
                      <h4 className="text-base font-bold text-white mt-1">Footprint Assessment</h4>
                      <p className="text-xs text-white/50 mt-1">
                        Primary Hotspot: <span className="text-[#A3FFB0] capitalize">{hotspot?.category || "N/A"}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-serif italic font-bold text-white">{total} tCO₂e</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/45">Annual Emissions</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan History List */}
      {props.planHistory.length > 0 && (
        <div className="mt-8 glass-panel p-6">
          <h3 className="text-sm uppercase tracking-[0.24em] text-[#A3FFB0] mb-6">Plan History</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {props.planHistory.map((row) => {
              const planData = row.plan as any;
              const totalWeeks = planData?.weeks?.length || 0;
              const formattedDate = new Date(row.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              });

              return (
                <div key={row.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#A3FFB0] border border-[#A3FFB0]/20 bg-[#A3FFB0]/5 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                    <h4 className="text-sm font-bold text-white mt-3">30-Day Movement Plan</h4>
                    <p className="text-xs text-white/40 mt-1">Generated on {formattedDate}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3 mt-1">
                    <span className="text-white/50">{totalWeeks} Weeks scheduled</span>
                    <span className="text-white font-semibold">100% Completion</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
