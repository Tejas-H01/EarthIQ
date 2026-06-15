import { z } from "zod";
import {
  carbonCategorySchema,
} from "./carbon.schema";
import {
  entityIdSchema,
  isoDateStringSchema,
  planningHorizonSchema,
  recommendationPrioritySchema,
} from "./shared.schema";

export const recommendationSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  title: z.string().min(1),
  rationale: z.string().min(1),
  priority: recommendationPrioritySchema,
  estimatedKgCo2eReduction: z.number().nonnegative().optional(),
  estimatedCost: z.number().nonnegative().optional(),
});

export const plannerMilestoneSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  targetDate: isoDateStringSchema,
  dependencies: z.array(entityIdSchema).optional(),
});

export const sustainabilityPlanSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  horizon: planningHorizonSchema,
  milestones: z.array(plannerMilestoneSchema),
  recommendations: z.array(recommendationSchema),
});

export const roiEstimateSchema = z.object({
  recommendationId: entityIdSchema,
  paybackMonths: z.number().nonnegative().optional(),
  netPresentValue: z.number().optional(),
  internalRateOfReturn: z.number().optional(),
  assumptions: z.record(z.string(), z.unknown()),
});

export const aiCoachMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
});

export const userProfileSchema = z.object({
  budget: z.number().nonnegative(),
  primaryGoal: z.enum(["reduce_emissions", "save_money", "low_effort"]),
  effortPreference: z.enum(["low", "medium", "high"]),
});

export const budgetLevelSchema = z.enum(["low", "medium", "high"]);

export const normalizedContextProfileSchema = z.object({
  budget: z.number().nonnegative(),
  budgetLevel: budgetLevelSchema,
  maxRecommendationCost: z.number().nonnegative(),
  primaryGoal: z.enum(["reduce_emissions", "save_money", "low_effort"]),
  effortPreference: z.enum(["low", "medium", "high"]),
});

export const coreRecommendationSchema = z.object({
  id: entityIdSchema,
  action: z.string().min(1),
  category: carbonCategorySchema,
  impact: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  difficulty: z.number().min(1),
  supportedBudgetLevels: z.array(budgetLevelSchema).min(1),
  supportedGoals: z.array(z.enum(["reduce_emissions", "save_money", "low_effort"])).min(1),
  supportedEffortLevels: z.array(z.enum(["low", "medium", "high"])).min(1),
  explanation: z.string().min(1),
  priorityScore: z.number().nonnegative(),
});

export const rankedRecommendationSchema = coreRecommendationSchema.extend({
  impactScore: z.number().nonnegative(),
  goalAlignment: z.number().nonnegative(),
  budgetCompatibility: z.number().nonnegative(),
});

export const fourWeekSustainabilityPlanSchema = z.object({
  weeks: z.array(
    z.object({
      week: z.number().int().min(1).max(4),
      actions: z.array(rankedRecommendationSchema),
    }),
  ).length(4),
});

export type RecommendationInput = z.infer<typeof recommendationSchema>;
export type PlannerMilestoneInput = z.infer<typeof plannerMilestoneSchema>;
export type SustainabilityPlanInput = z.infer<typeof sustainabilityPlanSchema>;
export type RoiEstimateInput = z.infer<typeof roiEstimateSchema>;
export type AiCoachMessageInput = z.infer<typeof aiCoachMessageSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type BudgetLevelInput = z.infer<typeof budgetLevelSchema>;
export type NormalizedContextProfileInput = z.infer<
  typeof normalizedContextProfileSchema
>;
export type CoreRecommendationInput = z.infer<
  typeof coreRecommendationSchema
>;
export type RankedRecommendationInput = z.infer<
  typeof rankedRecommendationSchema
>;
export type FourWeekSustainabilityPlanInput = z.infer<
  typeof fourWeekSustainabilityPlanSchema
>;
