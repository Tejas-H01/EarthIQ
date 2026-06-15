# EarthIQ

EarthIQ project foundation built with Next.js, TypeScript, Tailwind CSS, Supabase, Vitest, Zod, and Gemini integration placeholders.

## Architecture

```text
app/
  globals.css
  layout.tsx
  page.tsx
src/
  config/
    env.ts
  engines/
    ai-coach/
      ai-coach.engine.ts
      index.ts
    carbon/
      carbon.engine.ts
      index.ts
    hotspot/
      hotspot.engine.ts
      index.ts
    planner/
      index.ts
      planner.engine.ts
    recommendation/
      index.ts
      recommendation.engine.ts
    roi/
      index.ts
      roi.engine.ts
    index.ts
  interfaces/
    engines.ts
    index.ts
  lib/
    ai/
      gemini.client.ts
      index.ts
    errors.ts
    supabase/
      client.ts
      index.ts
  schemas/
    carbon.schema.ts
    index.ts
    recommendation.schema.ts
    shared.schema.ts
  tests/
    setup.ts
  types/
    domain.ts
    index.ts
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run test`
