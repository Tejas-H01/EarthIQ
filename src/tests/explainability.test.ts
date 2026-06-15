import { describe, expect, it } from "vitest";
import {
  AIContextBuilder,
  DecisionReportEngine,
  ExplanationEngine,
} from "@/engines";
import type {
  CarbonCalculationResult,
  ContextProfile,
  HotspotResult,
  RankedRecommendation,
  UserProfile,
} from "@/types";

const context: ContextProfile = {
  budget: 100,
  budgetLevel: "medium",
  maxRecommendationCost: 100,
  primaryGoal: "save_money",
  effortPreference: "low",
};

const carbonBreakdown: CarbonCalculationResult = {
  categories: {
    transport: 580,
    energy: 180,
    diet: 140,
    shopping: 100,
  },
  total: 1000,
};

const hotspot: HotspotResult = {
  category: "transport",
  percentageContribution: 58,
};

const recommendation: RankedRecommendation = {
  id: "transport-public-transit",
  action: "Use public transport twice weekly",
  category: "transport",
  impact: 320,
  cost: 40,
  difficulty: 2,
  supportedBudgetLevels: ["low", "medium", "high"],
  supportedGoals: ["save_money", "reduce_emissions"],
  supportedEffortLevels: ["low", "medium", "high"],
  explanation: "Transit lowers commute emissions and fuel costs.",
  priorityScore: 82,
  impactScore: 120,
  goalAlignment: 1.25,
  budgetCompatibility: 1.2,
};

const secondRecommendation: RankedRecommendation = {
  ...recommendation,
  id: "energy-setpoints",
  action: "Adjust heating and cooling setpoints",
  category: "energy",
  impact: 180,
  cost: 0,
  priorityScore: 70,
  impactScore: 90,
};

const userProfile: UserProfile = {
  budget: 100,
  primaryGoal: "save_money",
  effortPreference: "low",
};

describe("EarthIQ Explainable Intelligence Layer", () => {
  it("generates structured explanations for recommendations", () => {
    const engine = new ExplanationEngine();

    const result = engine.explainRecommendation({
      context,
      carbonBreakdown,
      hotspot,
      recommendation,
    });

    expect(result).toEqual(
      expect.objectContaining({
        title: "Use public transport twice weekly",
        summary: "transport is your largest source of emissions.",
        projectedImpact: {
          annualReductionKg: 320,
        },
        suitability: {
          budgetCompatible: true,
          goalAligned: true,
          effortCompatible: true,
        },
      }),
    );
    expect(result.reasoning).toContain(
      "This action could reduce approximately 320 kg CO2 annually.",
    );
  });

  it("uses hotspot reasoning dynamically", () => {
    const engine = new ExplanationEngine();
    const result = engine.explainRecommendation({
      context,
      carbonBreakdown,
      hotspot,
      recommendation,
    });

    expect(result.reasoning[0]).toBe("transport contributes 58% of your emissions.");
    expect(result.reasoning[1]).toBe("transport contributes 58% of your emissions.");
  });

  it("reports goal alignment reasoning", () => {
    const engine = new ExplanationEngine();
    const result = engine.explainRecommendation({
      context: {
        ...context,
        primaryGoal: "low_effort",
      },
      carbonBreakdown,
      hotspot,
      recommendation: {
        ...recommendation,
        supportedGoals: ["reduce_emissions"],
      },
    });

    expect(result.suitability.goalAligned).toBe(false);
    expect(result.reasoning).toContain(
      "This recommendation is less aligned with your primary goal.",
    );
  });

  it("explains non-hotspot actions and compatibility gaps", () => {
    const engine = new ExplanationEngine();
    const result = engine.explainRecommendation({
      context: {
        ...context,
        maxRecommendationCost: 10,
        effortPreference: "low",
      },
      carbonBreakdown,
      hotspot,
      recommendation: {
        ...secondRecommendation,
        category: "energy",
        cost: 250,
        supportedBudgetLevels: ["high"],
        supportedEffortLevels: ["medium", "high"],
      },
    });

    expect(result.summary).toBe(
      "Adjust heating and cooling setpoints targets energy while your largest source is transport.",
    );
    expect(result.suitability.budgetCompatible).toBe(false);
    expect(result.suitability.effortCompatible).toBe(false);
    expect(result.reasoning).toContain(
      "This recommendation may exceed your current budget fit.",
    );
    expect(result.reasoning).toContain(
      "This recommendation may require more effort than you prefer.",
    );
  });

  it("generates decision reports from explanation output", () => {
    const engine = new DecisionReportEngine();

    const report = engine.generateReport({
      userProfile,
      context,
      carbonBreakdown,
      hotspot,
      recommendations: [recommendation, secondRecommendation],
    });

    expect(report.totalEmissions).toBe(1000);
    expect(report.largestEmissionSource).toBe("transport");
    expect(report.hotspotPercentage).toBe(58);
    expect(report.bestAction).toEqual({
      action: "Use public transport twice weekly",
      impact: 320,
    });
    expect(report.projectedReduction).toBe(320);
    expect(report.recommendationSummaries).toHaveLength(2);
    expect(report.recommendationSummaries[0]?.explanation.reasoning.length).toBeGreaterThan(0);
  });

  it("builds compact AI-ready context without raw objects", () => {
    const report = new DecisionReportEngine().generateReport({
      userProfile,
      context,
      carbonBreakdown,
      hotspot,
      recommendations: [recommendation, secondRecommendation],
    });
    const payload = new AIContextBuilder().build({ report, context });

    expect(payload).toEqual({
      userType: "medium-budget-low-effort",
      primaryGoal: "save_money",
      emissions: {
        total: 1000,
        hotspot: "transport",
      },
      topRecommendations: [
        {
          action: "Use public transport twice weekly",
          category: "transport",
          impact: 320,
          priorityScore: 82,
        },
        {
          action: "Adjust heating and cooling setpoints",
          category: "energy",
          impact: 180,
          priorityScore: 70,
        },
      ],
      reasoning: expect.any(Array),
      plannerSummary: [
        "Week 1: Use public transport twice weekly",
        "Week 2: Adjust heating and cooling setpoints",
      ],
    });
    expect(payload.reasoning.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload)).not.toContain("supportedBudgetLevels");
  });

  it("handles empty recommendations, missing hotspot, and zero emissions", () => {
    const zeroBreakdown: CarbonCalculationResult = {
      categories: {
        transport: 0,
        energy: 0,
        diet: 0,
        shopping: 0,
      },
      total: 0,
    };
    const report = new DecisionReportEngine().generateReport({
      userProfile,
      context,
      carbonBreakdown: zeroBreakdown,
      hotspot: null,
      recommendations: [],
    });
    const explanation = new ExplanationEngine().explainRecommendation({
      context,
      carbonBreakdown: zeroBreakdown,
      hotspot: null,
      recommendation,
    });
    const payload = new AIContextBuilder().build({ report, context });

    expect(report).toEqual(
      expect.objectContaining({
        totalEmissions: 0,
        largestEmissionSource: null,
        hotspotPercentage: 0,
        bestAction: null,
        projectedReduction: 0,
        recommendationSummaries: [],
      }),
    );
    expect(explanation.reasoning).toContain(
      "No dominant emission hotspot is available for this analysis.",
    );
    expect(explanation.reasoning).toContain(
      "transport contributes 0% of your emissions.",
    );
    expect(payload.topRecommendations).toEqual([]);
    expect(payload.emissions.hotspot).toBeNull();
  });

  it("includes adjusted context insight when normalized budget differs", () => {
    const report = new DecisionReportEngine().generateReport({
      userProfile,
      context: {
        ...context,
        budget: 75,
      },
      carbonBreakdown,
      hotspot,
      recommendations: [recommendation],
    });

    expect(report.keyInsights).toContain(
      "The normalized context adjusted the provided budget signal.",
    );
  });
});
