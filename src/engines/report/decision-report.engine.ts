import type { IDecisionReportEngine } from "@/interfaces";
import type {
  CarbonCalculationResult,
  ContextProfile,
  DecisionReport,
  HotspotResult,
  RankedRecommendation,
  UserProfile,
} from "@/types";
import { ExplanationEngine } from "@/engines/explanation";

function buildInsights(input: {
  userProfile: UserProfile;
  context: ContextProfile;
  carbonBreakdown: CarbonCalculationResult;
  hotspot: HotspotResult | null;
  bestRecommendation?: RankedRecommendation;
}): string[] {
  const insights = [
    `Your annual footprint is ${input.carbonBreakdown.total} kg CO2e.`,
  ];

  if (input.hotspot) {
    insights.push(
      `${input.hotspot.category} is the largest emission source at ${input.hotspot.percentageContribution}%.`,
    );
  } else {
    insights.push("No largest emission source could be determined from the current data.");
  }

  insights.push(`Your primary goal is ${input.context.primaryGoal}.`);

  if (input.bestRecommendation) {
    insights.push(
      `The highest-ranked action is ${input.bestRecommendation.action}.`,
    );
  } else {
    insights.push("No ranked recommendations are available yet.");
  }

  if (input.userProfile.budget !== input.context.budget) {
    insights.push("The normalized context adjusted the provided budget signal.");
  }

  return insights;
}

export class DecisionReportEngine implements IDecisionReportEngine {
  constructor(private readonly explanationEngine = new ExplanationEngine()) {}

  generateReport(input: {
    userProfile: UserProfile;
    context: ContextProfile;
    carbonBreakdown: CarbonCalculationResult;
    hotspot: HotspotResult | null;
    recommendations: RankedRecommendation[];
  }): DecisionReport {
    const bestRecommendation = input.recommendations[0];
    const recommendationSummaries = input.recommendations.map(
      (recommendation) => ({
        id: recommendation.id,
        action: recommendation.action,
        category: recommendation.category,
        impact: recommendation.impact,
        priorityScore: recommendation.priorityScore,
        explanation: this.explanationEngine.explainRecommendation({
          context: input.context,
          carbonBreakdown: input.carbonBreakdown,
          hotspot: input.hotspot,
          recommendation,
        }),
      }),
    );

    return {
      totalEmissions: input.carbonBreakdown.total,
      largestEmissionSource: input.hotspot?.category ?? null,
      hotspotPercentage: input.hotspot?.percentageContribution ?? 0,
      bestAction: bestRecommendation
        ? {
            action: bestRecommendation.action,
            impact: bestRecommendation.impact,
          }
        : null,
      projectedReduction: bestRecommendation?.impact ?? 0,
      keyInsights: buildInsights({
        userProfile: input.userProfile,
        context: input.context,
        carbonBreakdown: input.carbonBreakdown,
        hotspot: input.hotspot,
        bestRecommendation,
      }),
      recommendationSummaries,
    };
  }
}
