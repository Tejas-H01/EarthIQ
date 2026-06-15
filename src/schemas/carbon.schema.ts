import { z } from "zod";
import {
  emissionScopeSchema,
  entityIdSchema,
  isoDateStringSchema,
} from "./shared.schema";

export const carbonCategorySchema = z.enum([
  "transport",
  "energy",
  "diet",
  "shopping",
]);

export const carbonCalculatorInputSchema = z.object({
  transport: z.object({
    weeklyDistanceKm: z.number().nonnegative(),
    kgCo2ePerKm: z.number().nonnegative(),
  }),
  energy: z.object({
    monthlyKwh: z.number().nonnegative(),
    kgCo2ePerKwh: z.number().nonnegative(),
  }),
  diet: z.object({
    weeklyKgCo2e: z.number().nonnegative(),
  }),
  shopping: z.object({
    monthlySpend: z.number().nonnegative(),
    kgCo2ePerCurrencyUnit: z.number().nonnegative(),
  }),
});

export const carbonCalculationResultSchema = z.object({
  categories: z.record(carbonCategorySchema, z.number().nonnegative()),
  total: z.number().nonnegative(),
});

export const hotspotResultSchema = z.object({
  category: carbonCategorySchema,
  percentageContribution: z.number().min(0).max(100),
});

export const activityRecordSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  source: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  occurredAt: isoDateStringSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const emissionFactorSchema = z.object({
  id: entityIdSchema,
  source: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  kgCo2ePerUnit: z.number().nonnegative(),
  scope: emissionScopeSchema,
  region: z.string().optional(),
  effectiveFrom: isoDateStringSchema.optional(),
});

export const carbonEstimateSchema = z.object({
  activityId: entityIdSchema,
  kgCo2e: z.number().nonnegative(),
  scope: emissionScopeSchema,
  factorId: entityIdSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export const carbonHotspotSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  label: z.string().min(1),
  kgCo2e: z.number().nonnegative(),
  shareOfTotal: z.number().min(0).max(1),
  scope: emissionScopeSchema.optional(),
  drivers: z.array(z.string().min(1)),
});

export type ActivityRecordInput = z.infer<typeof activityRecordSchema>;
export type EmissionFactorInput = z.infer<typeof emissionFactorSchema>;
export type CarbonEstimateInput = z.infer<typeof carbonEstimateSchema>;
export type CarbonHotspotInput = z.infer<typeof carbonHotspotSchema>;
export type CarbonCalculatorSchemaInput = z.infer<
  typeof carbonCalculatorInputSchema
>;
export type CarbonCalculationResultInput = z.infer<
  typeof carbonCalculationResultSchema
>;
export type HotspotResultInput = z.infer<typeof hotspotResultSchema>;
