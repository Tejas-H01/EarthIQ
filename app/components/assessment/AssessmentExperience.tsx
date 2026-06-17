"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { AssessmentFormState, EarthIqAssessmentResult } from "@/application";
import type { EffortPreference, PrimaryGoal } from "@/types";
import { CustomSelect } from "../ui";


// ─── Step configuration ──────────────────────────────────────────────────────

const assessmentSteps = [
  {
    title: "Transportation",
    eyebrow: "Chapter 01",
    description: "How far does movement carry your weekly footprint?",
    field: "weeklyTransportKm" as const,
    label: "Weekly driving distance",
    suffix: "km / week",
    presets: [40, 120, 260] as const,
    presetLabels: ["Occasional driver", "Regular commuter", "Heavy driver"],
    category: "transport",
  },
  {
    title: "Energy",
    eyebrow: "Chapter 02",
    description: "Your home energy profile becomes the second signal.",
    field: "monthlyEnergyKwh" as const,
    label: "Monthly electricity consumption",
    suffix: "kWh / month",
    presets: [160, 320, 620] as const,
    presetLabels: ["Energy efficient", "Average home", "High consumption"],
    category: "energy",
  },
  {
    title: "Food",
    eyebrow: "Chapter 03",
    description: "Diet choices shape a surprisingly personal carbon story.",
    field: "weeklyDietKgCo2e" as const,
    label: "Weekly diet carbon footprint",
    suffix: "kg CO₂e / week",
    presets: [22, 42, 70] as const,
    presetLabels: ["Plant-forward", "Mixed diet", "Meat-heavy"],
    category: "diet",
  },
  {
    title: "Lifestyle",
    eyebrow: "Chapter 04",
    description: "Shopping and replacement habits complete the pattern.",
    field: "monthlyShoppingSpend" as const,
    label: "Monthly lifestyle spend",
    suffix: "units / month",
    presets: [120, 420, 900] as const,
    presetLabels: ["Minimal buyer", "Moderate shopper", "Heavy spender"],
    category: "shopping",
  },
  {
    title: "Goals",
    eyebrow: "Chapter 05",
    description: "EarthIQ adapts the decision layer to your constraints.",
    field: "budget" as const,
    label: "Monthly action budget",
    suffix: "units / month",
    presets: [25, 100, 300] as const,
    presetLabels: ["Tight budget", "Moderate budget", "Flexible budget"],
    category: "goals",
  },
] as const;

// ─── Impact calculation (mirrors CarbonEngine emission factors) ───────────────

function calculateAnnualImpact(field: string, value: number): number {
  switch (field) {
    case "weeklyTransportKm":   return value * 0.192 * 52;
    case "monthlyEnergyKwh":    return value * 0.42 * 12;
    case "weeklyDietKgCo2e":    return value * 52;
    case "monthlyShoppingSpend": return value * 0.28 * 12;
    default: return 0;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressTimeline({
  currentStep,
  onStepChange,
}: {
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <ol aria-label="Assessment chapters" className="grid gap-0">
      {assessmentSteps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <li key={step.title} className="relative flex items-start gap-4">
            {/* Connector line */}
            {index < assessmentSteps.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-white/8">
                <motion.div
                  className="w-full origin-top"
                  style={{ background: "var(--color-signal)" }}
                  animate={{ scaleY: isCompleted ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}

            {/* Step indicator */}
            <button
              type="button"
              onClick={() => onStepChange(index)}
              aria-current={isActive ? "step" : undefined}
              className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300"
              style={{
                borderColor: isActive
                  ? "var(--color-signal)"
                  : isCompleted
                  ? "rgba(163,255,176,0.35)"
                  : "rgba(255,255,255,0.10)",
                background: isActive
                  ? "rgba(163,255,176,0.15)"
                  : isCompleted
                  ? "rgba(163,255,176,0.07)"
                  : "rgba(255,255,255,0.03)",
              }}
            >
              {isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M2.5 7L5.5 10L11.5 4"
                    stroke="#A3FFB0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span
                  className="font-mono text-xs"
                  style={{ color: isActive ? "var(--color-signal)" : "rgba(255,255,255,0.28)" }}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
            </button>

            {/* Step label */}
            <button
              type="button"
              onClick={() => onStepChange(index)}
              className="pb-7 pt-1 text-left"
            >
              <span
                className="block text-[10px] uppercase tracking-[0.22em]"
                style={{
                  color: isActive
                    ? "rgba(255,255,255,0.38)"
                    : isCompleted
                    ? "rgba(163,255,176,0.45)"
                    : "rgba(255,255,255,0.18)",
                }}
              >
                {step.eyebrow}
              </span>
              <span
                className="mt-0.5 block text-sm font-medium transition-colors duration-200"
                style={{
                  color: isActive ? "#fff" : isCompleted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
                }}
              >
                {step.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function PresetCard({
  value,
  suffix,
  label,
  impactKg,
  isSelected,
  onClick,
}: {
  value: number;
  suffix: string;
  label: string;
  impactKg: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97 }}
      className="w-full rounded-[1.5rem] border p-5 text-left"
      style={{
        background: isSelected ? "rgba(163,255,176,0.10)" : "rgba(255,255,255,0.04)",
        borderColor: isSelected ? "var(--color-signal)" : "rgba(255,255,255,0.10)",
        boxShadow: isSelected
          ? "0 0 0 1px var(--color-signal), 0 8px 32px rgba(163,255,176,0.10)"
          : "none",
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <span
        className="block text-4xl italic leading-none"
        style={{
          fontFamily: "var(--font-display)",
          color: isSelected ? "var(--color-signal)" : "#fff",
        }}
      >
        {value}
      </span>
      <span className="mt-1.5 block text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
        {suffix}
      </span>
      <span
        className="mt-3 block text-sm font-medium"
        style={{ color: isSelected ? "rgba(163,255,176,0.85)" : "rgba(255,255,255,0.55)" }}
      >
        {label}
      </span>
      {impactKg > 0 && (
        <span className="mt-1.5 block text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
          ≈ {Math.round(impactKg).toLocaleString()} kg CO₂e / yr
        </span>
      )}
    </motion.button>
  );
}

function ImpactPreview({ field, value }: { field: string; value: number }) {
  const annualKg = calculateAnnualImpact(field, value);
  if (annualKg <= 0) return null;

  const fillPercent = Math.min((annualKg / 5000) * 100, 100);

  return (
    <motion.div
      key={`${field}-${Math.round(annualKg)}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
    >
      <div className="flex items-center gap-2">
        <span className="signal-dot" aria-hidden="true" />
        <span className="text-xs uppercase tracking-[0.22em] text-white/38">Live estimate</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.round(annualKg)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="text-3xl italic"
            style={{ fontFamily: "var(--font-display)", color: "#fff" }}
          >
            {Math.round(annualKg).toLocaleString()}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm text-white/45">kg CO₂e / year</span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--color-signal)" }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1.5 text-xs text-white/28">
        Relative to a 5,000 kg annual reference
      </p>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssessmentExperienceProps {
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
}

// ─── Framer Motion variants ───────────────────────────────────────────────────

const stepVariants: Variants = {
  hidden: { opacity: 0, x: 24, filter: "blur(8px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.38, ease: "easeOut" } },
  exit:    { opacity: 0, x: -24, filter: "blur(8px)", transition: { duration: 0.22 } },
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AssessmentExperience(props: AssessmentExperienceProps) {
  const currentStep = assessmentSteps[props.step];
  const progress = ((props.step + 1) / assessmentSteps.length) * 100;
  const currentValue = Number(props.form[currentStep.field]);
  const isLastStep = props.step === assessmentSteps.length - 1;

  return (
    <section aria-label="EarthIQ Assessment">
      {/* Section header */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <motion.p variants={itemVariants} className="eyebrow">
          Assessment
        </motion.p>
        <motion.h2
          variants={itemVariants}
          className="mt-4 max-w-3xl text-5xl italic leading-[0.97] text-white sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Begin with a signal,{" "}
          <span style={{ color: "rgba(255,255,255,0.55)" }}>not a spreadsheet.</span>
        </motion.h2>
      </motion.div>

      {/* Mobile step progress bar */}
      <div className="mb-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-white/38">
            {currentStep.eyebrow}
          </span>
          <span className="text-xs text-white/38">
            {props.step + 1} / {assessmentSteps.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--color-signal)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

        {/* Left: Chapter timeline (desktop only) */}
        <div className="hidden lg:block">
          <div className="glass-panel p-6">
            {/* Progress header */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Chapters</p>
                <span className="text-xs text-white/35">{Math.round(progress)}%</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--color-signal)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            <ProgressTimeline
              currentStep={props.step}
              onStepChange={props.onStepChange}
            />
          </div>
        </div>

        {/* Right: Active step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.title}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-panel p-7 sm:p-10"
            style={{ minHeight: "560px" }}
          >
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {/* Eyebrow */}
              <motion.p variants={itemVariants} className="eyebrow">
                {currentStep.eyebrow}
              </motion.p>

              {/* Chapter title */}
              <motion.h3
                variants={itemVariants}
                className="mt-5 text-5xl italic leading-none text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentStep.title}
              </motion.h3>

              {/* Description */}
              <motion.p
                variants={itemVariants}
                className="mt-5 max-w-xl text-lg leading-8 text-white/65"
              >
                {currentStep.description}
              </motion.p>

              {/* Preset selection cards */}
              <motion.div
                variants={itemVariants}
                className="mt-10 grid gap-4 sm:grid-cols-3"
              >
                {(currentStep.presets as readonly number[]).map((preset, i) => (
                  <PresetCard
                    key={preset}
                    value={preset}
                    suffix={currentStep.suffix}
                    label={currentStep.presetLabels[i] ?? ""}
                    impactKg={calculateAnnualImpact(currentStep.field, preset)}
                    isSelected={currentValue === preset}
                    onClick={() => props.onNumberChange(currentStep.field, String(preset))}
                  />
                ))}
              </motion.div>

              {/* Custom input row */}
              <motion.div
                variants={itemVariants}
                className="mt-8 grid gap-6 md:grid-cols-2 text-white"
              >
                {currentStep.field === "budget" ? (
                  <div className="grid gap-4 md:col-span-1">
                    <div className="flex justify-between items-center text-sm font-medium text-white/60">
                      <span>Tight Budget</span>
                      <span className="text-base font-bold text-[#A3FFB0] bg-[#A3FFB0]/10 border border-[#A3FFB0]/20 rounded-full px-3 py-0.5">
                        {props.form.budget} units
                      </span>
                      <span>Flexible Budget</span>
                    </div>
                    <div className="relative mt-2 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="5"
                        value={props.form.budget}
                        onChange={(e) => props.onNumberChange("budget", e.target.value)}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A3FFB0]/50"
                        style={{
                          background: `linear-gradient(to right, #A3FFB0 0%, #A3FFB0 ${(props.form.budget / 500) * 100}%, rgba(255, 255, 255, 0.1) ${(props.form.budget / 500) * 100}%, rgba(255, 255, 255, 0.1) 100%)`
                        }}
                        aria-label="Monthly action budget"
                      />
                    </div>
                  </div>
                ) : (
                  <label className="grid gap-2.5 text-sm font-medium text-white/60">
                    {currentStep.label}
                    <input
                      type="number"
                      min="0"
                      value={props.form[currentStep.field]}
                      onChange={(e) => props.onNumberChange(currentStep.field, e.target.value)}
                      className="field-control"
                      aria-label={currentStep.label}
                    />
                  </label>
                )}

                {/* Goal & effort selects on final step */}
                {isLastStep && (
                  <div className="grid gap-4 sm:grid-cols-2 md:col-span-1">
                    <div className="grid gap-2.5 text-sm font-medium text-white/60">
                      <span>Primary goal</span>
                      <CustomSelect
                        value={props.form.primaryGoal}
                        onChange={(val) =>
                          props.onTextChange("primaryGoal", val as PrimaryGoal)
                        }
                        options={[
                          { value: "save_money", label: "Save money" },
                          { value: "reduce_emissions", label: "Reduce emissions" },
                          { value: "low_effort", label: "Keep effort low" },
                        ]}
                      />
                    </div>
                    <div className="grid gap-2.5 text-sm font-medium text-white/60">
                      <span>Effort level</span>
                      <CustomSelect
                        value={props.form.effortPreference}
                        onChange={(val) =>
                          props.onTextChange("effortPreference", val as EffortPreference)
                        }
                        options={[
                          { value: "low", label: "Low effort" },
                          { value: "medium", label: "Medium effort" },
                          { value: "high", label: "High effort" },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Live impact preview */}
              {!isLastStep && (
                <motion.div variants={itemVariants} className="mt-6">
                  <ImpactPreview field={currentStep.field} value={currentValue} />
                </motion.div>
              )}

              {/* Navigation */}
              <motion.div
                variants={itemVariants}
                className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => props.onStepChange(Math.max(0, props.step - 1))}
                  disabled={props.step === 0}
                  className="secondary-button disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>

                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={() =>
                      props.onStepChange(
                        Math.min(assessmentSteps.length - 1, props.step + 1),
                      )
                    }
                    className="primary-button"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={props.onGenerate}
                    disabled={props.isGenerating}
                    className="primary-button disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Generate EarthIQ story
                  </button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
