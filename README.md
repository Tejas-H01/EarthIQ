# EarthIQ — Intelligent Climate Companion

> A personalized sustainability intelligence platform powered by Google Gemini.  
> Built for the Google AI Competition 2026.

---

## Problem Statement

Climate action is abstract. People know they should reduce their carbon footprint, but they don't know **where to start**, **what actually matters**, or **why any given action was recommended to them**.

Existing tools produce:
- Generic advice not tailored to the individual
- Opaque recommendations with no explanation
- Information overload with no clear priority
- No feedback loop on progress

**EarthIQ solves this.** It builds a personalized carbon profile, identifies the highest-leverage opportunity, explains *why* using a multi-signal reasoning engine, and provides an actionable 30-day plan — all powered by a transparent intelligence stack.

---

## Solution

EarthIQ is a **climate intelligence companion**, not a carbon calculator.

It combines:
1. A **structured assessment** (transportation, energy, food, lifestyle, goals)
2. A **multi-engine intelligence layer** that ranks, explains, and plans
3. An **AI coach** powered by Google Gemini that answers questions grounded in the user's actual profile
4. A **story-driven Mission Control** that presents results as a personalized climate report

The user experience is designed to answer one question in under 15 seconds:

> *"What is the single most impactful thing I can do right now, and why did EarthIQ choose it?"*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│  Assessment Flow → Mission Control → AI Coach → Audit Report        │
│  (Next.js 16 · React · Framer Motion · Instrument Serif / Inter)    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                     APPLICATION LAYER                               │
│  EarthIqApplicationService · summarizeProgress · askCoach           │
└──────────────────┬──────────────────────┬───────────────────────────┘
                   │                      │
┌──────────────────▼──────┐  ┌────────────▼────────────────────────── ┐
│   INTELLIGENCE ENGINES  │  │         AI COACH LAYER                  │
│                         │  │                                         │
│  CarbonEngine           │  │  QuestionClassifier                     │
│  HotspotEngine          │  │  CoachPromptBuilder                     │
│  RecommendationEngine   │  │  CoachService → Gemini API              │
│  RankingEngine          │  │  AIContextBuilder                       │
│  PlannerEngine          │  │                                         │
│  ContextEngine          │  └─────────────────────────────────────────┘
│  ExplanationEngine      │
│  DecisionReportEngine   │
└──────────────────┬──────┘
                   │
┌──────────────────▼──────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                                 │
│           Supabase (assessments, recommendations, progress)          │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Directories

```
src/
├── engines/          # Domain intelligence engines (pure functions)
├── services/         # Coach service, prompt builder, question classifier
├── application/      # EarthIqApplicationService — orchestrates engines
├── repositories/     # Supabase data access layer
├── types/            # Shared domain types
└── tests/            # 27 unit tests across all layers

app/
├── components/
│   ├── assessment/       # Chapter-based onboarding flow
│   ├── mission-control/  # Story-driven carbon intelligence dashboard
│   ├── coach/            # AI coaching workspace
│   ├── audit/            # Sustainability Audit (Spotify Wrapped–style)
│   ├── layout/           # CinematicBackdrop, ChapterNav
│   └── ui/               # Design system primitives
├── globals.css           # Design tokens, glassmorphism, utilities
└── layout.tsx            # Next.js root layout with fonts
```

---

## Intelligence Layer

EarthIQ's recommendation pipeline runs 8 sequential engines:

| Engine | Purpose |
|--------|---------|
| `CarbonEngine` | Calculates annual CO₂e from transport, energy, diet, lifestyle inputs |
| `HotspotEngine` | Identifies the largest emission source and its percentage contribution |
| `RecommendationEngine` | Generates a candidate list of contextually-filtered actions |
| `RankingEngine` | Scores and orders candidates by impact × goal × budget × effort |
| `PlannerEngine` | Structures the top recommendation into a 4-week progressive plan |
| `ContextEngine` | Builds a structured profile combining user inputs and engine outputs |
| `ExplanationEngine` | Generates per-recommendation reasoning with suitability signals |
| `DecisionReportEngine` | Produces the final aggregated intelligence report |

Every recommendation surfaces **four alignment signals**:
- ✓ Hotspot alignment — targets the largest emission source
- ✓ Goal alignment — supports the user's declared primary goal
- ✓ Budget alignment — fits the user's stated budget level
- ✓ Effort alignment — matches the user's effort preference

---

## Explainability Layer

EarthIQ is built around **explainability-first** design.

The `ExplanationEngine` produces:
```ts
interface ExplanationResult {
  title: string;
  summary: string;          // Human-readable rationale
  reasoning: string[];      // Bullet-point reasoning chain
  projectedImpact: { annualReductionKg: number };
  suitability: {
    budgetCompatible: boolean;
    goalAligned: boolean;
    effortCompatible: boolean;
  };
}
```

This powers the **"Why EarthIQ Chose This"** section in both Mission Control and the Audit Report — making the reasoning transparent and trustworthy.

---

## AI Coach

The AI Coach uses Google Gemini to answer sustainability questions **grounded in the user's actual profile**.

Pipeline:
1. `QuestionClassifier` — categorises the question (weekly_focus / progress_summary / recommendation_explanation / sustainability_advice / goal_planning)
2. `AIContextBuilder` — assembles a structured prompt from live engine outputs
3. `CoachPromptBuilder` — formats the system instruction and user prompt
4. `CoachService` — calls Gemini and returns a structured `CoachResponse`

Every response includes:
- `type` — question category
- `grounding` — signal counts (recommendations, progress points, hotspot)
- `model` — the Gemini model used

The coach **never hallucates recommendations** — it only surfaces what the EarthIQ engines already computed.

---

## Security

- API keys stored in environment variables (`.env.local`)
- Supabase Row Level Security enabled on all tables
- No user PII stored beyond the assessment form inputs
- All AI calls proxied server-side through Next.js API routes

---

## Testing

```bash
npm run test        # 27 unit tests — all passing
npm run typecheck   # Zero TypeScript errors
npm run build       # Clean production build
```

Test coverage:

| Suite | Tests | Focus |
|-------|-------|-------|
| `foundation.test.ts` | 2 | Carbon calculations, emission factors |
| `intelligence-core.test.ts` | 6 | Hotspot, ranking, planner engines |
| `explainability.test.ts` | 8 | Explanation engine, suitability signals |
| `application-layer.test.ts` | 3 | End-to-end assessment flow |
| `persistence.test.ts` | 3 | Repository layer, Supabase integration |
| `coach.test.ts` | 5 | Question classification, coach service |

All business logic engines are covered independently. UI components contain zero business logic.

---

## Accessibility

- `:focus-visible` outlines on all interactive elements using the signal-green accent
- `aria-label` on every major section and interactive region
- `aria-live="polite"` on the coach conversation area
- `aria-current="step"` on the assessment chapter timeline
- Semantic HTML: `<main>`, `<section>`, `<article>`, `<aside>`, `<nav>`, `<form>`
- Keyboard-navigable assessment flow (tab + enter)
- Screen reader-compatible empty states with descriptive labels

---

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google AI Studio API key (Gemini)

### Install

```bash
git clone https://github.com/your-org/earthiq
cd earthiq
npm install
```

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Run

```bash
npm run dev         # Development server at localhost:3000
npm run build       # Production build
npm run test        # Run test suite
```

---

## Demo Flow

EarthIQ includes a **one-click demo mode** for judges.

1. Open the app at `localhost:3000`
2. Click **⚡ Try Demo** on the landing page
3. EarthIQ instantly loads a realistic sample profile and runs the full intelligence pipeline
4. The cinematic "EarthIQ is reading your signals…" overlay plays
5. Mission Control opens automatically showing a complete carbon story

**Demo profile:**
- Weekly transport: 120 km (regular commuter)
- Monthly energy: 320 kWh (average home)
- Weekly diet: 42 kg CO₂e (mixed diet)
- Monthly lifestyle spend: 420 units
- Goal: Reduce emissions · Budget: Moderate · Effort: Medium

The demo uses **real EarthIQ engines** — not mocked data.

---

## Screens

| Screen | Purpose |
|--------|---------|
| **Hero** | Landing with demo button and capability overview |
| **Assessment** | Chapter-based 5-step onboarding (Transport → Energy → Food → Lifestyle → Goals) |
| **Mission Control** | Story-driven carbon intelligence: 7 sections from hero to confidence arc |
| **AI Coach** | Sustainability strategist with context awareness + structured responses |
| **Progress** | 30-day plan tracker with completion state |
| **Sustainability Audit** | Spotify Wrapped–style 9-section intelligence report with shareable scorecard |

---

## Why EarthIQ Is Different

Most carbon tools tell you **what** to do. EarthIQ tells you **why**.

| Feature | Generic Tools | EarthIQ |
|---------|--------------|---------|
| Personalised to profile | ❌ | ✓ |
| Explains *why* this recommendation | ❌ | ✓ |
| Multi-signal ranking (goal + budget + effort + impact) | ❌ | ✓ |
| AI coach grounded in personal data | ❌ | ✓ |
| Progressive 4-week action plan | ❌ | ✓ |
| Confidence signals per recommendation | ❌ | ✓ |
| Separation of business logic from UI | Varies | Strict |
| Tested intelligence engine pipeline | Varies | 27 tests |

EarthIQ is not a chatbot with a carbon calculator bolted on.  
It is a **decision intelligence system** with a cinematic presentation layer.

---

*Built with Next.js · Google Gemini · Supabase · Framer Motion · TypeScript*
