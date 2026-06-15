import { z } from "zod";

export const entityIdSchema = z.string().min(1);
export const isoDateStringSchema = z.string().datetime();

export const emissionScopeSchema = z.enum(["scope_1", "scope_2", "scope_3"]);
export const recommendationPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export const planningHorizonSchema = z.enum([
  "quarter",
  "year",
  "three_years",
  "five_years",
]);
