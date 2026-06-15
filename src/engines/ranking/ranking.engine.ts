import type { RankingEngine as RankingEngineContract } from "@/interfaces";
import type {
  BudgetLevel,
  CoreRecommendation,
  EffortPreference,
  NormalizedContextProfile,
  PrimaryGoal,
  RankedRecommendation,
  UserProfile,
} from "@/types";
import { ContextEngine } from "@/engines/context";

const contextEngine = new ContextEngine();

function getBudgetCostWeight(cost: number, budget: number): number {
  if (cost === 0) {
    return 1;
  }

  if (cost > budget) {
    return 6;
  }

  return budget < 100 ? 3 : 2;
}

function getBudgetCompatibility(
  recommendation: CoreRecommendation,
  budgetLevel: BudgetLevel,
): number {
  return recommendation.supportedBudgetLevels.includes(budgetLevel) ? 1.2 : 0.6;
}

function getDifficultyWeight(
  difficulty: number,
  effortPreference: EffortPreference,
): number {
  const preferenceMultiplier = {
    low: 3,
    medium: 2,
    high: 1,
  } satisfies Record<EffortPreference, number>;

  return difficulty * preferenceMultiplier[effortPreference];
}

function getGoalAdjustedImpact(
  recommendation: CoreRecommendation,
  primaryGoal: PrimaryGoal,
): number {
  if (primaryGoal === "reduce_emissions") {
    return recommendation.impact * 1.25;
  }

  if (primaryGoal === "save_money" && recommendation.cost === 0) {
    return recommendation.impact * 1.15;
  }

  if (primaryGoal === "low_effort" && recommendation.difficulty <= 2) {
    return recommendation.impact * 1.15;
  }

  return recommendation.impact;
}

function getGoalAlignment(
  recommendation: CoreRecommendation,
  primaryGoal: PrimaryGoal,
): number {
  return recommendation.supportedGoals.includes(primaryGoal) ? 1.25 : 0.75;
}

export class RankingEngine implements RankingEngineContract {
  async rankRecommendations(input: {
    recommendations: CoreRecommendation[];
    profile: UserProfile | NormalizedContextProfile;
  }): Promise<RankedRecommendation[]> {
    const profile =
      "budgetLevel" in input.profile
        ? input.profile
        : await contextEngine.normalizeContext({ userProfile: input.profile });

    return input.recommendations
      .map((recommendation) => {
        const impact = getGoalAdjustedImpact(
          recommendation,
          profile.primaryGoal,
        );
        const costWeight = getBudgetCostWeight(
          recommendation.cost,
          profile.budget,
        );
        const difficultyWeight = getDifficultyWeight(
          recommendation.difficulty,
          profile.effortPreference,
        );
        const goalAlignment = getGoalAlignment(recommendation, profile.primaryGoal);
        const budgetCompatibility = getBudgetCompatibility(
          recommendation,
          profile.budgetLevel,
        );

        return {
          ...recommendation,
          impactScore: Number(
            (
              (impact * goalAlignment * budgetCompatibility +
                recommendation.priorityScore) /
              (costWeight + difficultyWeight)
            ).toFixed(4),
          ),
          goalAlignment,
          budgetCompatibility,
        };
      })
      .sort((left, right) => right.impactScore - left.impactScore);
  }
}
