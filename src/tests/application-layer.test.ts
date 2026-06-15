import { describe, expect, it } from "vitest";
import {
  EarthIqApplicationService,
  askCoach,
  getDefaultAssessmentForm,
  summarizeProgress,
} from "@/application";

describe("EarthIQ Application Layer", () => {
  it("orchestrates assessment, report, recommendations, plan, and coach context", async () => {
    const service = new EarthIqApplicationService();
    const result = await service.generateAssessment(getDefaultAssessmentForm());

    expect(result.carbonBreakdown.total).toBeGreaterThan(0);
    expect(result.hotspot.category).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.plan.weeks).toHaveLength(4);
    expect(result.decisionReport.totalEmissions).toBe(result.carbonBreakdown.total);
    expect(result.coachContext.decisionInsights.length).toBeGreaterThan(0);
  });

  it("summarizes completed action progress", async () => {
    const service = new EarthIqApplicationService();
    const result = await service.generateAssessment(getDefaultAssessmentForm());
    const firstRecommendation = result.recommendations[0];

    expect(firstRecommendation).toBeDefined();

    const progress = summarizeProgress({
      recommendations: result.recommendations,
      completedActionIds: firstRecommendation ? [firstRecommendation.id] : [],
    });

    expect(progress.completedActions).toHaveLength(1);
    expect(progress.savedEmissions).toBe(firstRecommendation?.impact);
    expect(progress.streakWeeks).toBe(1);
  });

  it("routes coach questions through CoachService", async () => {
    const service = new EarthIqApplicationService();
    const result = await service.generateAssessment(getDefaultAssessmentForm());
    const response = await askCoach({
      question: "Why is this recommendation best?",
      result,
      completedActionIds: [],
    });

    expect(response.category).toBe("recommendation");
    expect(response.answer).toContain("EarthIQ selected it");
    expect(response.grounding.recommendationCount).toBe(result.recommendations.length);
  });
});
