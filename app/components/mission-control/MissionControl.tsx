"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { EarthIqAssessmentResult } from "@/application";
import type { Variants } from "framer-motion";
import { EmptyState } from "../ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTons(kg: number): string { return (kg / 1000).toFixed(1); }
function fmtKg(kg: number): string { return `${Math.round(kg).toLocaleString()} kg`; }
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

const categoryLabel: Record<string, string> = {
  transport: "Transportation", energy: "Home Energy",
  diet: "Food & Diet", shopping: "Lifestyle",
};

function calcConfidence(summary: EarthIqAssessmentResult["decisionReport"]["recommendationSummaries"][number] | null): number {
  if (!summary) return 0;
  const s = summary.explanation.suitability;
  const aligned = [true, s.goalAligned, s.budgetCompatible, s.effortCompatible].filter(Boolean).length;
  return Math.min(Math.round((aligned / 4) * 55 + (summary.priorityScore / 100) * 45), 99);
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1.3): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return val;
}

// ─── Section reveal wrapper ───────────────────────────────────────────────────

const sectionV: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={sectionV}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Suitability check row ────────────────────────────────────────────────────

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
        style={{
          background: ok ? "rgba(163,255,176,0.12)" : "rgba(255,255,255,0.05)",
          borderColor: ok ? "rgba(163,255,176,0.45)" : "rgba(255,255,255,0.10)",
        }}
      >
        {ok ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4L3.5 6.5L9 1" stroke="#A3FFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
        )}
      </div>
      <span className="text-sm" style={{ color: ok ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.38)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Confidence arc ───────────────────────────────────────────────────────────

function ConfidenceArc({ pct }: { pct: number }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="116" height="116" viewBox="0 0 116 116" className="-rotate-90" aria-hidden="true">
      <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
      <motion.circle
        cx="58" cy="58" r={r} fill="none"
        stroke="#A3FFB0" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
      />
    </svg>
  );
}

// ─── Difficulty dots ──────────────────────────────────────────────────────────

function Dots({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className="h-2 w-2 rounded-full"
          style={{ background: i < level ? "var(--color-signal)" : "rgba(255,255,255,0.12)" }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MissionControl({ result }: { result: EarthIqAssessmentResult | null }) {
  if (!result) {
    return (
      <EmptyState
        label="Start the assessment to reveal your carbon story."
        description="EarthIQ needs your inputs before it can generate your personalized sustainability intelligence."
      />
    );
  }

  const { carbonBreakdown, hotspot, recommendations, plan, decisionReport, contextProfile } = result;
  const topRec  = recommendations[0] ?? null;
  const topSum  = decisionReport.recommendationSummaries[0] ?? null;
  const suit    = topSum?.explanation.suitability;
  const conf    = calcConfidence(topSum);
  const totTons = carbonBreakdown.total / 1000;
  const afterKg = Math.max(0, carbonBreakdown.total - decisionReport.projectedReduction);

  const cats = Object.entries(carbonBreakdown.categories)
    .map(([k, v]) => ({ k, label: categoryLabel[k] ?? k, kg: v, pct: Math.round((v / carbonBreakdown.total) * 100) }))
    .sort((a, b) => b.kg - a.kg);

  // Animated counters
  const cTons   = useCounter(totTons, 1.3);
  const cHotPct = useCounter(hotspot.percentageContribution, 1.1);
  const cImpact = useCounter(topRec?.impact ?? 0, 1.0);
  const cAfter  = useCounter(afterKg / 1000, 1.2);
  const cConf   = useCounter(conf, 1.4);

  return (
    <div className="grid gap-6 pb-8">

      {/* ── SECTION 1: Hero Story Card ─────────────────────────────────────── */}
      <Reveal>
        <article className="glass-elevated p-8 sm:p-12" aria-label="Your carbon story summary">
          <div className="flex items-center gap-3">
            <span className="signal-dot" aria-hidden="true" />
            <p className="eyebrow">Your Carbon Story</p>
          </div>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_220px]">
            <div>
              <p className="text-sm text-white/40">Annual carbon footprint</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-7xl italic leading-none text-white sm:text-8xl"
                  style={{ fontFamily: "var(--font-display)" }}>
                  {cTons.toFixed(1)}
                </span>
                <span className="text-2xl text-white/45">Tons CO₂e</span>
              </div>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/60">
                {decisionReport.keyInsights[0] ?? `Your footprint is primarily driven by ${categoryLabel[hotspot.category] ?? hotspot.category}.`}
              </p>
            </div>
            <div className="grid gap-3 self-center">
              {cats.map((c) => (
                <div key={c.k}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-xs text-white/40">{c.label}</span>
                    <span className="text-xs font-medium text-white/65">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div className="h-full rounded-full"
                      style={{ background: c.k === hotspot.category ? "var(--color-signal)" : "rgba(255,255,255,0.22)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${c.pct}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </Reveal>

      {/* ── SECTION 2: Hotspot + SECTION 3: Recommendation (side by side) ──── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Biggest Opportunity */}
        <Reveal delay={0.05}>
          <article className="glass-panel h-full p-8" aria-label="Biggest emission opportunity">
            <p className="eyebrow">Biggest Opportunity</p>
            <div className="mt-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-5xl italic leading-none text-white sm:text-6xl"
                  style={{ fontFamily: "var(--font-display)" }}>
                  {cap(hotspot.category)}
                </h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                    {Math.round(cHotPct)}%
                  </span>
                  <span className="text-sm text-white/45">of footprint</span>
                </div>
              </div>
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border"
                style={{ background: "rgba(163,255,176,0.06)", borderColor: "rgba(163,255,176,0.22)", boxShadow: "0 0 40px rgba(163,255,176,0.08)" }}>
                <span className="text-2xl italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                  {Math.round(cHotPct)}%
                </span>
                <span className="signal-dot absolute -right-0.5 -top-0.5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-white/60">
              {hotspot.percentageContribution > 50 ? "More than half" : "A significant portion"} of your annual
              emissions concentrate in {categoryLabel[hotspot.category] ?? hotspot.category}. This is
              where EarthIQ focused its analysis.
            </p>
          </article>
        </Reveal>

        {/* Recommended Action */}
        <Reveal delay={0.1}>
          <article className="glass-panel h-full p-8"
            style={{ borderLeft: "3px solid var(--color-signal)" }}
            aria-label="Top recommended action">
            <p className="eyebrow">Top Recommendation</p>
            <h3 className="mt-5 text-3xl italic leading-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}>
              {topRec?.action ?? "Complete assessment"}
            </h3>
            <div className="mt-6 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <span className="text-sm text-white/50">Annual reduction</span>
                <span className="text-lg italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                  {Math.round(cImpact).toLocaleString()} kg
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <span className="text-sm text-white/50">Difficulty</span>
                <Dots level={topRec?.difficulty ?? 0} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <span className="text-sm text-white/50">Est. cost</span>
                <span className="text-sm font-medium text-white/75">
                  {topRec?.cost === 0 ? "Free" : `~${topRec?.cost ?? 0} units`}
                </span>
              </div>
            </div>
          </article>
        </Reveal>
      </div>

      {/* ── SECTION 4: Why EarthIQ Chose This ────────────────────────────────── */}
      <Reveal delay={0.05}>
        <article className="glass-panel p-8 sm:p-10" aria-label="EarthIQ recommendation reasoning">
          <div className="flex items-center gap-3">
            <p className="eyebrow">Why EarthIQ Chose This</p>
          </div>
          {topSum && (
            <p className="mt-4 text-base leading-7 text-white/65">{topSum.explanation.summary}</p>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Check ok label={`Targets ${categoryLabel[hotspot.category] ?? hotspot.category} — your #1 source`} />
            <Check ok={suit?.goalAligned ?? false}
              label={suit?.goalAligned ? `Aligned with your ${contextProfile.primaryGoal.replaceAll("_", " ")} goal` : "Not ideal for your primary goal"} />
            <Check ok={suit?.budgetCompatible ?? false}
              label={suit?.budgetCompatible ? `Fits your ${contextProfile.budgetLevel} budget` : "May exceed your budget"} />
            <Check ok={suit?.effortCompatible ?? false}
              label={suit?.effortCompatible ? `Matches your ${contextProfile.effortPreference} effort preference` : "Higher effort than preferred"} />
          </div>
          {topSum?.explanation.reasoning && topSum.explanation.reasoning.length > 0 && (
            <div className="mt-8 grid gap-2">
              {topSum.explanation.reasoning.map((r, i) => (
                <p key={i} className="card-insight text-sm leading-6 text-white/65">{r}</p>
              ))}
            </div>
          )}
        </article>
      </Reveal>

      {/* ── SECTION 5: Impact Projection ─────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <article className="glass-panel p-8 sm:p-10" aria-label="Impact projection">
          <p className="eyebrow">Impact Projection</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-white/38">Current</p>
              <p className="mt-3 text-4xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
                {totTons.toFixed(1)}<span className="ml-1 text-xl text-white/40">t</span>
              </p>
              <p className="mt-1 text-xs text-white/35">CO₂e / year</p>
            </div>
            <div className="rounded-2xl border p-6 text-center"
              style={{ borderColor: "rgba(163,255,176,0.35)", background: "rgba(163,255,176,0.06)" }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-signal)" }}>
                After action
              </p>
              <p className="mt-3 text-4xl italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                {cAfter.toFixed(1)}<span className="ml-1 text-xl" style={{ color: "rgba(163,255,176,0.5)" }}>t</span>
              </p>
              <p className="mt-1 text-xs" style={{ color: "rgba(163,255,176,0.5)" }}>CO₂e / year</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-white/38">Reduction</p>
              <p className="mt-3 text-4xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
                {fmtKg(decisionReport.projectedReduction)}
              </p>
              <p className="mt-1 text-xs text-white/35">annually</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-white/35">
              <span>Current footprint</span>
              <span>Net zero target (2,000 kg)</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((carbonBreakdown.total / 8000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }} />
              <motion.div className="absolute left-0 top-0 h-full rounded-full"
                style={{ background: "var(--color-signal)" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((afterKg / 8000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }} />
            </div>
          </div>
        </article>
      </Reveal>

      {/* ── SECTION 6: 30-Day Plan ────────────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <article className="glass-panel p-8 sm:p-10" aria-label="30-day sustainability plan">
          <p className="eyebrow">Your 30-Day Movement</p>
          <h3 className="mt-4 text-3xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
            A progressive plan built around your life.
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plan.weeks.map((week) => (
              <motion.div key={week.week}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (week.week - 1) * 0.08 }}>
                <p className="text-xs uppercase tracking-widest text-white/35">Week {week.week}</p>
                <div className="mt-3 grid gap-2">
                  {week.actions.length === 0 ? (
                    <p className="text-sm text-white/35">Review progress.</p>
                  ) : (
                    week.actions.map((a) => (
                      <div key={a.id} className="card-insight text-sm leading-5 text-white/70">
                        {a.action}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </article>
      </Reveal>

      {/* ── SECTION 7: EarthIQ Confidence ────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <article className="glass-panel p-8 sm:p-10" aria-label="EarthIQ confidence score">
          <p className="eyebrow">EarthIQ Confidence</p>
          <div className="mt-8 grid gap-10 sm:grid-cols-[auto_1fr]">
            <div className="relative flex items-center justify-center">
              <ConfidenceArc pct={conf} />
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {Math.round(cConf)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm leading-7 text-white/60">
                EarthIQ computed this recommendation by analyzing your hotspot, aligning it with your
                goals, validating budget and effort compatibility, and ranking all candidates.
              </p>
              <div className="mt-6 grid gap-2.5">
                <Check ok label="Hotspot-targeted recommendation" />
                <Check ok={suit?.goalAligned ?? false} label="Goal alignment verified" />
                <Check ok={suit?.budgetCompatible ?? false} label="Budget compatibility confirmed" />
                <Check ok={suit?.effortCompatible ?? false} label="Effort level compatible" />
              </div>
              {decisionReport.keyInsights.slice(1).map((insight, i) => (
                <p key={i} className="mt-4 text-sm leading-6 text-white/45">{insight}</p>
              ))}
            </div>
          </div>
        </article>
      </Reveal>

    </div>
  );
}
