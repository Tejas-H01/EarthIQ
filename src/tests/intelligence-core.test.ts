import { describe, expect, it } from "vitest";
import {
  CarbonEngine,
  ContextEngine,
  HotspotEngine,
  PlannerEngine,
  RankingEngine,
  RecommendationEngine,
} from "@/engines";
import type { CarbonCategory, CoreRecommendation, UserProfile } from "@/types";

const carbonInput = {
  transport: {
    weeklyDistanceKm: 100,
    kgCo2ePerKm: 0.2,
  },
  energy: {
    monthlyKwh: 300,
    kgCo2ePerKwh: 0.4,
  },
  diet: {
    weeklyKgCo2e: 50,
  },
  shopping: {
    monthlySpend: 500,
    kgCo2ePerCurrencyUnit: 0.1,
  },
};

function makeRecommendation(
  overrides: Partial<CoreRecommendation> & Pick<CoreRecommendation, "id" | "action">,
): CoreRecommendation {
  return {
    category: "energy",
    impact: 100,
    cost: 0,
    difficulty: 1,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["reduce_emissions", "save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Test recommendation",
    priorityScore: 50,
    ...overrides,
  };
}

describe("EarthIQ Intelligence Core", () => {
  it("calculates annual category and total emissions", async () => {
    const engine = new CarbonEngine();

    await expect(engine.calculateAnnualEmissions(carbonInput)).resolves.toEqual({
      categories: {
        transport: 1040,
        energy: 1440,
        diet: 2600,
        shopping: 600,
      },
      total: 5680,
    });
  });

  it("detects the highest emission hotspot and its contribution", async () => {
    const carbonEngine = new CarbonEngine();
    const hotspotEngine = new HotspotEngine();
    const result = await carbonEngine.calculateAnnualEmissions(carbonInput);

    await expect(hotspotEngine.identifyHighestCategory(result)).resolves.toEqual({
      category: "diet",
      percentageContribution: 45.77,
    });
  });

  it("generates a normalized context profile", async () => {
    const engine = new ContextEngine();

    await expect(
      engine.normalizeContext({
        userProfile: {
          budget: 75,
          primaryGoal: "reduce_emissions",
          effortPreference: "medium",
        },
        effortPreference: "low",
        primaryGoal: "save_money",
      }),
    ).resolves.toEqual({
      budget: 75,
      budgetLevel: "medium",
      maxRecommendationCost: 75,
      primaryGoal: "save_money",
      effortPreference: "low",
    });
  });

  it("filters recommendations by budget, effort, and goal context", async () => {
    const engine = new RecommendationEngine();
    const profile: UserProfile = {
      budget: 25,
      primaryGoal: "save_money",
      effortPreference: "low",
    };

    const recommendations = await engine.generateForProfile({
      hotspot: {
        category: "diet",
        percentageContribution: 45.77,
      },
      profile,
    });

    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((item) => item.category === "diet")).toBe(true);
    expect(
      recommendations.every((item) => item.supportedGoals.includes("save_money")),
    ).toBe(true);
    expect(
      recommendations.every((item) => item.supportedEffortLevels.includes("low")),
    ).toBe(true);
  });

  it("ranks recommendations with budget, goal, and effort preferences", async () => {
    const engine = new RankingEngine();
    const recommendations: CoreRecommendation[] = [
      makeRecommendation({
        id: "high-impact-expensive",
        action: "Major retrofit",
        impact: 900,
        cost: 2000,
        difficulty: 5,
        supportedBudgetLevels: ["high"],
        supportedGoals: ["reduce_emissions"],
        supportedEffortLevels: ["high"],
        priorityScore: 95,
      }),
      makeRecommendation({
        id: "low-cost-easy",
        action: "Thermostat adjustment",
        impact: 250,
        cost: 0,
        difficulty: 1,
        supportedGoals: ["save_money", "low_effort"],
        priorityScore: 70,
      }),
    ];

    const ranked = await engine.rankRecommendations({
      recommendations,
      profile: {
        budget: 50,
        primaryGoal: "low_effort",
        effortPreference: "low",
      },
    });

    expect(ranked[0]?.id).toBe("low-cost-easy");
    expect(ranked[0]?.impactScore).toBeGreaterThan(ranked[1]?.impactScore ?? 0);
    expect(ranked[0]?.goalAlignment).toBe(1.25);
    expect(ranked[1]?.budgetCompatibility).toBe(0.6);
  });

  it("generates a 4-week plan that progresses difficulty and alternates categories", async () => {
    const planner = new PlannerEngine();
    const ranking = new RankingEngine();
    const recommendations: CoreRecommendation[] = [
      makeRecommendation({
        id: "first",
        action: "Adjust setpoints",
        category: "energy",
        impact: 300,
        cost: 0,
        difficulty: 1,
      }),
      makeRecommendation({
        id: "duplicate",
        action: "Adjust setpoints",
        category: "energy",
        impact: 300,
        cost: 0,
        difficulty: 1,
      }),
      makeRecommendation({
        id: "second",
        action: "Carpool once",
        category: "transport",
        impact: 120,
        cost: 0,
        difficulty: 2,
      }),
      makeRecommendation({
        id: "third",
        action: "Plant-forward dinners",
        category: "diet",
        impact: 400,
        cost: 10,
        difficulty: 3,
      }),
      makeRecommendation({
        id: "fourth",
        action: "Repair before replacing",
        category: "shopping",
        impact: 250,
        cost: 20,
        difficulty: 3,
      }),
    ];
    const ranked = await ranking.rankRecommendations({
      recommendations,
      profile: {
        budget: 100,
        primaryGoal: "reduce_emissions",
        effortPreference: "medium",
      },
    });

    const plan = await planner.generateFourWeekPlan({ recommendations: ranked });
    const actions = plan.weeks.flatMap((week) =>
      week.actions.map((action) => action.action),
    );
    const categories = plan.weeks.flatMap((week) =>
      week.actions.map((action) => action.category),
    );
    const difficulties = plan.weeks.flatMap((week) =>
      week.actions.map((action) => action.difficulty),
    );

    expect(plan.weeks).toHaveLength(4);
    expect(new Set(actions).size).toBe(actions.length);
    expect(difficulties).toEqual([...difficulties].sort((left, right) => left - right));
    expect(
      categories.every(
        (category: CarbonCategory, index) =>
          index === 0 || category !== categories[index - 1],
      ),
    ).toBe(true);
  });
});
