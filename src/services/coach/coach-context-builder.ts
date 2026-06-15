import type {
  CoachContext,
  CoachContextBuilderInput,
  RecommendationSummary,
} from "@/types";
import { ExplanationEngine } from "@/engines";

function buildRecommendationContext(
  input: CoachContextBuilderInput,
): CoachContext["recommendations"] {
  if (input.decisionReport) {
    return input.decisionReport.recommendationSummaries.map((summary) => ({
      action: summary.action,
      category: summary.category,
      impact: summary.impact,
      reasoning: summary.explanation.reasoning,
      suitability: summary.explanation.suitability,
    }));
  }

  if (!input.latestAssessment) {
    return [];
  }

  const explanationEngine = new ExplanationEngine();
  const assessment = input.latestAssessment;

  return input.recommendations.map((recommendation) => {
    const explanation = explanationEngine.explainRecommendation({
      context: assessment.contextProfile,
      carbonBreakdown: assessment.carbonBreakdown,
      hotspot: assessment.hotspot,
      recommendation,
    });

    return {
      action: recommendation.action,
      category: recommendation.category,
      impact: recommendation.impact,
      reasoning: explanation.reasoning,
      suitability: explanation.suitability,
    };
  });
}

function buildDecisionInsights(
  summaries: RecommendationSummary[],
  fallbackInsights: string[],
): string[] {
  if (fallbackInsights.length > 0) {
    return fallbackInsights;
  }

  return summaries.flatMap((summary) => summary.explanation.reasoning.slice(0, 1));
}

export class CoachContextBuilder {
  build(input: CoachContextBuilderInput): CoachContext {
    const assessment = input.latestAssessment;
    const recommendationContext = buildRecommendationContext(input);

    return {
      userProfile: input.userProfile,
      contextProfile: assessment?.contextProfile ?? {
        budget: input.userProfile.budget,
        budgetLevel:
          input.userProfile.budget <= 50
            ? "low"
            : input.userProfile.budget <= 200
              ? "medium"
              : "high",
        maxRecommendationCost: input.userProfile.budget,
        primaryGoal: input.userProfile.primaryGoal,
        effortPreference: input.userProfile.effortPreference,
      },
      emissions: {
        total: assessment?.carbonBreakdown.total ?? 0,
        hotspot: assessment?.hotspot?.category ?? null,
        hotspotPercentage: assessment?.hotspot?.percentageContribution ?? 0,
      },
      recommendations: recommendationContext,
      plan:
        input.plan?.weeks.map((week) => ({
          week: week.week,
          actions: week.actions.map((action) => action.action),
        })) ?? [],
      progress: input.progress,
      decisionInsights: buildDecisionInsights(
        input.decisionReport?.recommendationSummaries ?? [],
        input.decisionReport?.keyInsights ?? [],
      ),
    };
  }
}
