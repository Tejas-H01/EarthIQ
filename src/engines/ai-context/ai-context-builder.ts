import type { IAIContextBuilder } from "@/interfaces";
import type { AIContextPayload, ContextProfile, DecisionReport } from "@/types";

export class AIContextBuilder implements IAIContextBuilder {
  build(input: {
    report: DecisionReport;
    context: ContextProfile;
  }): AIContextPayload {
    const topRecommendations = input.report.recommendationSummaries
      .slice(0, 3)
      .map((recommendation) => ({
        action: recommendation.action,
        category: recommendation.category,
        impact: recommendation.impact,
        priorityScore: recommendation.priorityScore,
      }));

    return {
      userType: `${input.context.budgetLevel}-budget-${input.context.effortPreference}-effort`,
      primaryGoal: input.context.primaryGoal,
      emissions: {
        total: input.report.totalEmissions,
        hotspot: input.report.largestEmissionSource,
      },
      topRecommendations,
      reasoning: input.report.recommendationSummaries.flatMap((summary) =>
        summary.explanation.reasoning.slice(0, 3),
      ),
      plannerSummary: topRecommendations.map(
        (recommendation, index) =>
          `Week ${index + 1}: ${recommendation.action}`,
      ),
    };
  }
}
