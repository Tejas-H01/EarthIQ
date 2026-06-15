import type { IExplanationEngine } from "@/interfaces";
import type {
  CarbonCalculationResult,
  ContextProfile,
  CoreRecommendation,
  ExplanationResult,
  HotspotResult,
  SuitabilityResult,
} from "@/types";

function formatCategory(category: string): string {
  return category.replaceAll("_", " ");
}

function formatPercentage(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function getSuitability(
  context: ContextProfile,
  recommendation: CoreRecommendation,
): SuitabilityResult {
  return {
    budgetCompatible:
      recommendation.cost <= context.maxRecommendationCost &&
      recommendation.supportedBudgetLevels.includes(context.budgetLevel),
    goalAligned: recommendation.supportedGoals.includes(context.primaryGoal),
    effortCompatible: recommendation.supportedEffortLevels.includes(
      context.effortPreference,
    ),
  };
}

function getSummary(
  hotspot: HotspotResult | null,
  recommendation: CoreRecommendation,
): string {
  if (!hotspot) {
    return `${recommendation.action} is evaluated against your current sustainability context.`;
  }

  if (hotspot.category === recommendation.category) {
    return `${formatCategory(hotspot.category)} is your largest source of emissions.`;
  }

  return `${recommendation.action} targets ${formatCategory(
    recommendation.category,
  )} while your largest source is ${formatCategory(hotspot.category)}.`;
}

export class ExplanationEngine implements IExplanationEngine {
  explainRecommendation(input: {
    context: ContextProfile;
    carbonBreakdown: CarbonCalculationResult;
    hotspot: HotspotResult | null;
    recommendation: CoreRecommendation;
  }): ExplanationResult {
    const suitability = getSuitability(input.context, input.recommendation);
    const categoryTotal =
      input.carbonBreakdown.categories[input.recommendation.category] ?? 0;
    const categoryContribution =
      input.carbonBreakdown.total === 0
        ? 0
        : (categoryTotal / input.carbonBreakdown.total) * 100;
    const hotspotContribution = input.hotspot?.percentageContribution ?? 0;

    const reasoning = [
      input.hotspot
        ? `${formatCategory(input.hotspot.category)} contributes ${formatPercentage(
            hotspotContribution,
          )} of your emissions.`
        : "No dominant emission hotspot is available for this analysis.",
      `${formatCategory(input.recommendation.category)} contributes ${formatPercentage(
        categoryContribution,
      )} of your emissions.`,
      `This action could reduce approximately ${input.recommendation.impact} kg CO2 annually.`,
      suitability.budgetCompatible
        ? "This recommendation aligns with your budget."
        : "This recommendation may exceed your current budget fit.",
      suitability.goalAligned
        ? "This recommendation matches your sustainability goals."
        : "This recommendation is less aligned with your primary goal.",
      suitability.effortCompatible
        ? "This recommendation matches your effort preference."
        : "This recommendation may require more effort than you prefer.",
    ];

    return {
      title: input.recommendation.action,
      summary: getSummary(input.hotspot, input.recommendation),
      reasoning,
      projectedImpact: {
        annualReductionKg: input.recommendation.impact,
      },
      suitability,
    };
  }
}
