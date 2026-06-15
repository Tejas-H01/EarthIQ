"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EarthIqApplicationService,
  askCoach,
  getDefaultAssessmentForm,
  summarizeProgress,
  type AssessmentFormState,
  type EarthIqAssessmentResult,
} from "@/application";
import type { CoachResponse, PrimaryGoal, EffortPreference } from "@/types";

type Screen = "assessment" | "dashboard" | "coach" | "progress" | "audit";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
  response?: CoachResponse;
}

const screens: Array<{ id: Screen; label: string }> = [
  { id: "assessment", label: "Assessment" },
  { id: "dashboard", label: "Mission Control" },
  { id: "coach", label: "AI Coach" },
  { id: "progress", label: "Progress" },
  { id: "audit", label: "Audit Report" },
];

const suggestedQuestions = [
  "Why is this recommendation best for me?",
  "What should I focus on this week?",
  "How is my progress looking?",
  "What is driving my footprint?",
];

function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString()} kg CO2e`;
}

function updateNumber(
  value: string,
  fallback: number,
): number {
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
  const recommendationReasoning =
    result?.decisionReport.recommendationSummaries[0]?.explanation.reasoning ??
    [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              EarthIQ Application Layer
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Sustainability mission control
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Complete an assessment, review explainable recommendations, plan
              the next four weeks, and ask the AI coach for guidance grounded in
              EarthIQ decisions.
            </p>
          </div>
          <nav
            aria-label="Application screens"
            className="flex gap-2 overflow-x-auto"
          >
            {screens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveScreen(screen.id)}
                className={`min-h-11 shrink-0 rounded-md border px-4 py-2 text-sm font-medium transition ${
                  activeScreen === screen.id
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                {screen.label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {activeScreen === "assessment" && (
        <AssessmentFlow
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
          reasoning={recommendationReasoning}
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
        <ProgressScreen
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
    </main>
  );
}

function AssessmentFlow(props: {
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
  const steps = ["Profile", "Footprint", "Priorities", "Review"];

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
      <aside className="border-b border-slate-200 pb-4 lg:border-b-0 lg:border-r lg:pr-6">
        <ol className="grid gap-2" aria-label="Assessment steps">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => props.onStepChange(index)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                  props.step === index
                    ? "bg-emerald-100 text-emerald-950"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Step {index + 1}: {label}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div className="grid gap-6">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          {props.step === 0 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Sustainability profile</h2>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Name or household label
                <input
                  value={props.form.name}
                  onChange={(event) =>
                    props.onTextChange("name", event.target.value)
                  }
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-base"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Profile type
                <select
                  value={props.form.profileType}
                  onChange={(event) =>
                    props.onTextChange("profileType", event.target.value)
                  }
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-base"
                >
                  <option value="student">Student</option>
                  <option value="household">Household</option>
                  <option value="professional">Professional</option>
                  <option value="family">Family</option>
                </select>
              </label>
            </div>
          )}

          {props.step === 1 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Footprint inputs</h2>
              <NumberField
                label="Transport distance per week"
                suffix="km"
                value={props.form.weeklyTransportKm}
                onChange={(value) =>
                  props.onNumberChange("weeklyTransportKm", value)
                }
              />
              <NumberField
                label="Home energy per month"
                suffix="kWh"
                value={props.form.monthlyEnergyKwh}
                onChange={(value) =>
                  props.onNumberChange("monthlyEnergyKwh", value)
                }
              />
              <NumberField
                label="Diet footprint per week"
                suffix="kg CO2e"
                value={props.form.weeklyDietKgCo2e}
                onChange={(value) =>
                  props.onNumberChange("weeklyDietKgCo2e", value)
                }
              />
              <NumberField
                label="Shopping spend per month"
                suffix="budget units"
                value={props.form.monthlyShoppingSpend}
                onChange={(value) =>
                  props.onNumberChange("monthlyShoppingSpend", value)
                }
              />
            </div>
          )}

          {props.step === 2 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Decision context</h2>
              <NumberField
                label="Monthly sustainability budget"
                suffix="budget units"
                value={props.form.budget}
                onChange={(value) => props.onNumberChange("budget", value)}
              />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Primary goal
                <select
                  value={props.form.primaryGoal}
                  onChange={(event) =>
                    props.onTextChange(
                      "primaryGoal",
                      event.target.value as PrimaryGoal,
                    )
                  }
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-base"
                >
                  <option value="save_money">Save money</option>
                  <option value="reduce_emissions">Reduce emissions</option>
                  <option value="low_effort">Keep effort low</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Effort preference
                <select
                  value={props.form.effortPreference}
                  onChange={(event) =>
                    props.onTextChange(
                      "effortPreference",
                      event.target.value as EffortPreference,
                    )
                  }
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-base"
                >
                  <option value="low">Low effort</option>
                  <option value="medium">Medium effort</option>
                  <option value="high">High effort</option>
                </select>
              </label>
            </div>
          )}

          {props.step === 3 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Assessment review</h2>
              <p className="text-sm leading-6 text-slate-600">
                EarthIQ will run the carbon calculator, detect your hotspot,
                filter and rank recommendations, generate a four-week plan, and
                produce an explainable decision report.
              </p>
              <button
                type="button"
                onClick={props.onGenerate}
                disabled={props.isGenerating}
                className="min-h-11 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
              >
                {props.isGenerating ? "Generating assessment" : "Generate assessment"}
              </button>
              {props.result && (
                <p className="text-sm font-medium text-emerald-800">
                  Assessment ready. Open Mission Control to review the result.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={() => props.onStepChange(Math.max(0, props.step - 1))}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => props.onStepChange(Math.min(3, props.step + 1))}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function NumberField(props: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {props.label}
      <span className="flex min-h-11 overflow-hidden rounded-md border border-slate-300 bg-white">
        <input
          type="number"
          min="0"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full px-3 text-base outline-none"
        />
        <span className="flex items-center border-l border-slate-300 bg-slate-100 px-3 text-sm text-slate-600">
          {props.suffix}
        </span>
      </span>
    </label>
  );
}

function MissionControl(props: {
  result: EarthIqAssessmentResult | null;
  topRecommendation: EarthIqAssessmentResult["recommendations"][number] | null;
  reasoning: string[];
}) {
  if (!props.result) {
    return <EmptyState label="Generate an assessment to open Mission Control." />;
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total emissions" value={formatKg(props.result.carbonBreakdown.total)} />
        <Metric label="Largest source" value={props.result.hotspot.category} />
        <Metric label="Hotspot share" value={`${props.result.hotspot.percentageContribution}%`} />
        <Metric
          label="Top action impact"
          value={props.topRecommendation ? formatKg(props.topRecommendation.impact) : "None"}
        />
        <Metric
          label="Projected reduction"
          value={formatKg(props.result.decisionReport.projectedReduction)}
        />
      </div>

      <section className="border-y border-slate-200 bg-white py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3">
            <h2 className="text-2xl font-semibold">Top recommendation</h2>
            <p className="text-lg font-medium text-slate-800">
              {props.topRecommendation?.action ?? "No recommendation available"}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {props.topRecommendation?.explanation}
            </p>
          </div>
          <div className="grid gap-3">
            <h3 className="text-lg font-semibold">Recommendation reasoning</h3>
            <ul className="grid gap-2">
              {props.reasoning.map((reason) => (
                <li
                  key={reason}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
                >
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </section>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{props.label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{props.value}</p>
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
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
      <aside className="grid content-start gap-3">
        <h2 className="text-xl font-semibold">Suggested questions</h2>
        {suggestedQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => props.onSuggestedQuestion(suggestion)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700"
          >
            {suggestion}
          </button>
        ))}
      </aside>
      <section className="grid min-h-[520px] grid-rows-[1fr_auto] rounded-md border border-slate-200 bg-white">
        <div
          className="grid content-start gap-3 p-4"
          aria-live="polite"
          aria-label="Coach conversation"
        >
          {props.messages.length === 0 && (
            <p className="text-sm leading-6 text-slate-600">
              Ask the coach about recommendations, progress, footprint drivers,
              or planning. Responses are generated through CoachService using
              EarthIQ reasoning.
            </p>
          )}
          {props.messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-3xl rounded-md px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "justify-self-end bg-emerald-700 text-white"
                  : "justify-self-start bg-slate-100 text-slate-800"
              }`}
            >
              <p>{message.content}</p>
              {message.response && (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {message.response.type.replaceAll("_", " ")}
                </p>
              )}
            </div>
          ))}
          {props.isCoachThinking && (
            <p className="text-sm font-medium text-slate-500">Coach is preparing a grounded response.</p>
          )}
        </div>
        <form
          className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <label className="sr-only" htmlFor="coach-question">
            Ask the coach
          </label>
          <input
            id="coach-question"
            value={props.question}
            onChange={(event) => props.onQuestionChange(event.target.value)}
            placeholder="Ask about your plan, progress, or top recommendation"
            className="min-h-11 rounded-md border border-slate-300 px-3 text-base"
          />
          <button
            type="submit"
            className="min-h-11 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Send
          </button>
        </form>
      </section>
    </section>
  );
}

function ProgressScreen(props: {
  result: EarthIqAssessmentResult | null;
  completedActionIds: string[];
  progressSummary: ReturnType<typeof summarizeProgress> | null;
  onToggleAction: (actionId: string) => void;
}) {
  if (!props.result || !props.progressSummary) {
    return <EmptyState label="Generate an assessment to track progress." />;
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Saved emissions" value={formatKg(props.progressSummary.savedEmissions)} />
        <Metric label="Completed actions" value={`${props.progressSummary.completedActions.length}`} />
        <Metric label="Current streak" value={`${props.progressSummary.streakWeeks} week${props.progressSummary.streakWeeks === 1 ? "" : "s"}`} />
      </div>

      <section className="border-y border-slate-200 bg-white py-6">
        <h2 className="text-2xl font-semibold">Current plan</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {props.result.plan.weeks.map((week) => (
            <article key={week.week} className="rounded-md border border-slate-200 p-4">
              <h3 className="font-semibold">Week {week.week}</h3>
              {week.actions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No action scheduled.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {week.actions.map((action) => (
                    <li key={action.id} className="flex items-start gap-3">
                      <input
                        id={`action-${action.id}`}
                        type="checkbox"
                        checked={props.completedActionIds.includes(action.id)}
                        onChange={() => props.onToggleAction(action.id)}
                        className="mt-1 size-4"
                      />
                      <label htmlFor={`action-${action.id}`} className="grid gap-1 text-sm">
                        <span className="font-medium text-slate-800">{action.action}</span>
                        <span className="text-slate-600">{formatKg(action.impact)} annual reduction</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function AuditReport(props: { result: EarthIqAssessmentResult | null }) {
  if (!props.result) {
    return <EmptyState label="Generate an assessment to view the audit report." />;
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-semibold">Sustainability audit report</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          A decision-ready summary generated from EarthIQ assessment,
          recommendation, ranking, planning, and explainability engines.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">Decision report summary</h3>
          <p className="text-sm leading-6 text-slate-700">
            Total emissions are {formatKg(props.result.decisionReport.totalEmissions)}.
            Largest source is {props.result.decisionReport.largestEmissionSource}
            {" "}at {props.result.decisionReport.hotspotPercentage}%.
          </p>
          <p className="text-sm leading-6 text-slate-700">
            Projected reduction from the top action is{" "}
            {formatKg(props.result.decisionReport.projectedReduction)}.
          </p>
        </section>
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">Key insights</h3>
          <ul className="grid gap-2">
            {props.result.decisionReport.keyInsights.map((insight) => (
              <li key={insight} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6">
                {insight}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Top recommendations</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {props.result.decisionReport.recommendationSummaries.map((summary) => (
            <article key={summary.id} className="rounded-md border border-slate-200 bg-white p-4">
              <h4 className="font-semibold">{summary.action}</h4>
              <p className="mt-2 text-sm text-slate-600">
                {formatKg(summary.impact)} annual reduction in {summary.category}.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {summary.explanation.summary}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">30-day plan</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {props.result.plan.weeks.map((week) => (
            <article key={week.week} className="rounded-md border border-slate-200 bg-white p-4">
              <h4 className="font-semibold">Week {week.week}</h4>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                {week.actions.length === 0 ? (
                  <li>Review progress and prepare the next action.</li>
                ) : (
                  week.actions.map((action) => <li key={action.id}>{action.action}</li>)
                )}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function EmptyState(props: { label: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {props.label}
      </div>
    </section>
  );
}
