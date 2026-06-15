import type { ContextEngine as ContextEngineContract } from "@/interfaces";
import type {
  BudgetLevel,
  ContextEngineInput,
  NormalizedContextProfile,
} from "@/types";

const budgetCaps = {
  low: 50,
  medium: 200,
  high: 1000,
} satisfies Record<BudgetLevel, number>;

function inferBudgetLevel(budget: number): BudgetLevel {
  if (budget <= budgetCaps.low) {
    return "low";
  }

  if (budget <= budgetCaps.medium) {
    return "medium";
  }

  return "high";
}

export class ContextEngine implements ContextEngineContract {
  async normalizeContext(
    input: ContextEngineInput,
  ): Promise<NormalizedContextProfile> {
    const budgetLevel = input.budgetLevel ?? inferBudgetLevel(input.userProfile.budget);

    return {
      budget: input.userProfile.budget,
      budgetLevel,
      maxRecommendationCost: Math.min(input.userProfile.budget, budgetCaps[budgetLevel]),
      primaryGoal: input.primaryGoal ?? input.userProfile.primaryGoal,
      effortPreference: input.effortPreference ?? input.userProfile.effortPreference,
    };
  }
}
