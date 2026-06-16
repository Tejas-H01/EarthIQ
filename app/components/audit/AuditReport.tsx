"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import type { EarthIqAssessmentResult, summarizeProgress } from "@/application";
import { EmptyState } from "../ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PS = ReturnType<typeof summarizeProgress>;
const catLabel: Record<string, string> = {
  transport: "Transportation", energy: "Home Energy",
  diet: "Food & Diet", shopping: "Lifestyle",
};
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtKg(n: number) { return `${Math.round(n).toLocaleString()} kg`; }
function fmtT(n: number) { return (n / 1000).toFixed(1); }

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCounter(target: number, dur = 1.3) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let f: number, t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / (dur * 1000), 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [target, dur]);
  return v;
}

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────

const sV: Variants = {
  hidden:  { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: { opacity: 1, y:  0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};

function R({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const ok = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={sV} initial="hidden"
      animate={ok ? "visible" : "hidden"} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Check row ────────────────────────────────────────────────────────────────

function Chk({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
        style={{ background: ok ? "rgba(163,255,176,0.12)" : "rgba(255,255,255,0.05)", borderColor: ok ? "rgba(163,255,176,0.45)" : "rgba(255,255,255,0.10)" }}>
        {ok ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#A3FFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : <div className="h-1.5 w-1.5 rounded-full bg-white/20" />}
      </div>
      <span className="text-sm" style={{ color: ok ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.35)" }}>{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  result: EarthIqAssessmentResult | null;
  progressSummary: PS | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditReport({ result, progressSummary }: Props) {
  if (!result) {
    return <EmptyState label="Generate an assessment to unlock the Sustainability Audit."
      description="EarthIQ needs your profile data before it can produce your intelligence report." />;
  }

  const { carbonBreakdown, hotspot, recommendations, plan, decisionReport, contextProfile } = result;
  const topRec  = recommendations[0] ?? null;
  const topSum  = decisionReport.recommendationSummaries[0] ?? null;
  const suit    = topSum?.explanation.suitability;
  const totT    = carbonBreakdown.total / 1000;
  const afterKg = Math.max(0, carbonBreakdown.total - decisionReport.projectedReduction);
  const cTons   = useCounter(totT, 1.4);
  const cHot    = useCounter(hotspot.percentageContribution, 1.1);
  const cImp    = useCounter(topRec?.impact ?? 0, 1.0);
  const cAfter  = useCounter(afterKg / 1000, 1.3);

  const cats = Object.entries(carbonBreakdown.categories)
    .map(([k, v]) => ({ k, label: catLabel[k] ?? k, kg: v, pct: Math.round((v / carbonBreakdown.total) * 100) }))
    .sort((a, b) => b.kg - a.kg);

  return (
    <div className="grid gap-8 pb-12">

      {/* ── S1: Cover Story ─────────────────────────────────────────────── */}
      <R>
        <article className="glass-elevated p-10 sm:p-14" aria-label="EarthIQ Sustainability Audit">
          <div className="flex items-center gap-3">
            <span className="signal-dot" aria-hidden="true" />
            <p className="eyebrow">EarthIQ Sustainability Audit</p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
            A personalized climate intelligence report built from your footprint, goals, recommendations, and progress.
          </p>
          <div className="mt-10 flex items-baseline gap-4">
            <span className="text-8xl italic leading-none text-white sm:text-9xl"
              style={{ fontFamily: "var(--font-display)" }}>
              {cTons.toFixed(1)}
            </span>
            <div>
              <p className="text-2xl text-white/45">Tons CO₂e</p>
              <p className="mt-1 text-sm text-white/30">annual carbon footprint</p>
            </div>
          </div>
          {/* Category bars */}
          <div className="mt-10 grid max-w-lg gap-3">
            {cats.map((c) => (
              <div key={c.k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-white/40">{c.label}</span>
                  <span className="font-medium text-white/65">{c.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div className="h-full rounded-full"
                    style={{ background: c.k === hotspot.category ? "var(--color-signal)" : "rgba(255,255,255,0.20)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </R>

      {/* ── S2 + S3: Carbon Story & Biggest Opportunity ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <R delay={0.05}>
          <article className="glass-panel h-full p-8">
            <p className="eyebrow">Your Carbon Story</p>
            <h3 className="mt-6 text-6xl italic leading-none text-white"
              style={{ fontFamily: "var(--font-display)" }}>
              {cap(hotspot.category)}
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl italic" style={{ fontFamily: "var(--font-display)", color: "var(--color-signal)" }}>
                {Math.round(cHot)}%
              </span>
              <span className="text-sm text-white/45">of your footprint</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/60">
              {hotspot.percentageContribution > 50 ? "More than half" : "A significant portion"} of
              your annual emissions come from {catLabel[hotspot.category] ?? hotspot.category} choices.
              This is where EarthIQ concentrated its analysis.
            </p>
          </article>
        </R>
        <R delay={0.1}>
          <article className="glass-panel h-full p-8" style={{ borderLeft: "3px solid var(--color-signal)" }}>
            <p className="eyebrow">Biggest Opportunity</p>
            <h3 className="mt-5 text-3xl italic leading-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}>
              {topRec?.action ?? "Complete assessment"}
            </h3>
            <div className="mt-6 grid gap-3">
              {[
                { label: "Annual reduction", value: `${Math.round(cImp).toLocaleString()} kg CO₂e` },
                { label: "Difficulty",       value: `${topRec?.difficulty ?? 0} / 5` },
                { label: "Estimated cost",   value: topRec?.cost === 0 ? "Free" : `~${topRec?.cost ?? 0} units` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <span className="text-sm text-white/50">{label}</span>
                  <span className="text-sm font-medium" style={{ color: label === "Annual reduction" ? "var(--color-signal)" : "rgba(255,255,255,0.75)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </R>
      </div>

      {/* ── S4: Why EarthIQ Chose This ──────────────────────────────────── */}
      <R>
        <article className="glass-panel p-8 sm:p-10">
          <p className="eyebrow">Why EarthIQ Chose This</p>
          {topSum && <p className="mt-4 text-base leading-7 text-white/65">{topSum.explanation.summary}</p>}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Chk ok label={`Targets ${catLabel[hotspot.category] ?? hotspot.category} — your #1 source`} />
            <Chk ok={suit?.goalAligned ?? false}
              label={suit?.goalAligned ? `Aligned with ${contextProfile.primaryGoal.replaceAll("_", " ")} goal` : "Partial goal alignment"} />
            <Chk ok={suit?.budgetCompatible ?? false}
              label={suit?.budgetCompatible ? `Fits ${contextProfile.budgetLevel} budget` : "May exceed budget"} />
            <Chk ok={suit?.effortCompatible ?? false}
              label={suit?.effortCompatible ? `Matches ${contextProfile.effortPreference} effort` : "Higher effort than preferred"} />
          </div>
          {topSum?.explanation.reasoning && (
            <div className="mt-8 grid gap-2">
              {topSum.explanation.reasoning.map((r, i) => (
                <p key={i} className="text-sm leading-6 text-white/55 border-l-2 pl-4" style={{ borderColor: "rgba(163,255,176,0.25)" }}>{r}</p>
              ))}
            </div>
          )}
        </article>
      </R>

      {/* ── S5: Future Impact ───────────────────────────────────────────── */}
      <R>
        <article className="glass-panel p-8 sm:p-10">
          <p className="eyebrow">Your Future Impact</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              { label: "Current",     val: fmtT(carbonBreakdown.total),        unit: "t/yr",  hi: false },
              { label: "After action",val: cAfter.toFixed(1),                   unit: "t/yr",  hi: true  },
              { label: "Reduction",   val: fmtKg(decisionReport.projectedReduction), unit: "/yr", hi: false },
            ].map(({ label, val, unit, hi }) => (
              <div key={label} className="rounded-2xl border p-6 text-center"
                style={{ borderColor: hi ? "rgba(163,255,176,0.35)" : "rgba(255,255,255,0.08)", background: hi ? "rgba(163,255,176,0.06)" : "rgba(255,255,255,0.04)" }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: hi ? "var(--color-signal)" : "rgba(255,255,255,0.38)" }}>{label}</p>
                <p className="mt-3 text-4xl italic" style={{ fontFamily: "var(--font-display)", color: hi ? "var(--color-signal)" : "#fff" }}>{val}</p>
                <p className="mt-1 text-xs" style={{ color: hi ? "rgba(163,255,176,0.5)" : "rgba(255,255,255,0.30)" }}>{unit}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-white/30">
              <span>Current footprint</span><span>Net zero (2,000 kg)</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                initial={{ width: 0 }} animate={{ width: `${Math.min((carbonBreakdown.total / 8000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }} />
              <motion.div className="absolute left-0 top-0 h-full rounded-full" style={{ background: "var(--color-signal)" }}
                initial={{ width: 0 }} animate={{ width: `${Math.min((afterKg / 8000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }} />
            </div>
          </div>
        </article>
      </R>

      {/* ── S6: 30-Day Plan ─────────────────────────────────────────────── */}
      <R>
        <article className="glass-panel p-8 sm:p-10">
          <p className="eyebrow">Your 30-Day Sustainability Plan</p>
          <h3 className="mt-4 text-3xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
            A progressive movement built around your life.
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plan.weeks.map((week) => (
              <motion.div key={week.week}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.38, delay: (week.week - 1) * 0.08 }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: "var(--color-signal)" }}>
                    {String(week.week).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-white/35">Week {week.week}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {week.actions.length === 0
                    ? <p className="text-xs leading-5 text-white/35">Review progress.</p>
                    : week.actions.map((a) => (
                        <p key={a.id} className="text-sm leading-5 text-white/70 border-l pl-3"
                          style={{ borderColor: "rgba(163,255,176,0.2)" }}>{a.action}</p>
                      ))
                  }
                </div>
              </motion.div>
            ))}
          </div>
        </article>
      </R>

      {/* ── S7: Progress Reflection ──────────────────────────────────────── */}
      {progressSummary && (
        <R>
          <article className="glass-panel p-8 sm:p-10">
            <p className="eyebrow">Progress Reflection</p>
            <h3 className="mt-4 text-3xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
              You have already prevented{" "}
              <span style={{ color: "var(--color-signal)" }}>{fmtKg(progressSummary.savedEmissions)}</span>
              {" "}of CO₂e emissions.
            </h3>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Carbon saved",      value: fmtKg(progressSummary.savedEmissions) },
                { label: "Actions completed", value: `${progressSummary.completedActions.length}` },
                { label: "Active streak",     value: `${progressSummary.streakWeeks} wk${progressSummary.streakWeeks !== 1 ? "s" : ""}` },
              ].map(({ label, value }) => (
                <div key={label} className="glass-panel p-6 text-center">
                  <p className="text-xs uppercase tracking-widest text-white/35">{label}</p>
                  <p className="mt-3 text-4xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
                </div>
              ))}
            </div>
          </article>
        </R>
      )}

      {/* ── S8: Executive Summary ────────────────────────────────────────── */}
      <R>
        <article className="glass-panel p-8 sm:p-10">
          <p className="eyebrow">EarthIQ Executive Summary</p>
          <h3 className="mt-4 text-3xl italic text-white" style={{ fontFamily: "var(--font-display)" }}>
            Your next chapter is specific, measurable, and within reach.
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {decisionReport.keyInsights.map((insight, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                <span className="font-mono text-xs" style={{ color: "var(--color-signal)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-sm leading-6 text-white/70">{insight}</p>
              </div>
            ))}
          </div>
        </article>
      </R>

      {/* ── S9: Shareable Scorecard ──────────────────────────────────────── */}
      <R>
        <article
          className="relative overflow-hidden rounded-[2rem] p-[1px]"
          style={{ background: "linear-gradient(135deg, rgba(163,255,176,0.5) 0%, rgba(44,117,255,0.35) 50%, rgba(163,255,176,0.2) 100%)" }}
          aria-label="EarthIQ shareable scorecard"
        >
          <div className="rounded-[calc(2rem-1px)] bg-[#0a0a0a] p-8 sm:p-12">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="signal-dot" aria-hidden="true" />
                <p className="text-sm font-medium uppercase tracking-[0.22em]" style={{ color: "var(--color-signal)" }}>
                  EarthIQ Scorecard
                </p>
              </div>
              <p className="text-xs text-white/25">Sustainability Intelligence Report</p>
            </div>

            {/* Big metric */}
            <div className="mt-8 flex items-baseline gap-4">
              <span className="text-7xl italic text-white sm:text-8xl"
                style={{ fontFamily: "var(--font-display)" }}>
                {fmtT(carbonBreakdown.total)}
              </span>
              <span className="text-xl text-white/40">t CO₂e / yr</span>
            </div>

            {/* Four stats */}
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Largest source",    value: cap(hotspot.category), sub: `${hotspot.percentageContribution}% of total` },
                { label: "Top action",        value: topRec?.action ?? "—", sub: `${fmtKg(topRec?.impact ?? 0)} reduction` },
                { label: "Potential savings", value: fmtKg(decisionReport.projectedReduction), sub: "annually" },
                { label: "Goal",              value: cap(contextProfile.primaryGoal.replaceAll("_", " ")), sub: contextProfile.effortPreference + " effort" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white/[0.03] p-5">
                  <p className="text-xs text-white/35 uppercase tracking-widest">{label}</p>
                  <p className="mt-2 text-base font-medium leading-5 text-white">{value}</p>
                  <p className="mt-1 text-xs text-white/35">{sub}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-white/20">
              Generated by EarthIQ · Powered by Google Gemini · Carbon data is approximate
            </p>
          </div>
        </article>
      </R>

    </div>
  );
}
