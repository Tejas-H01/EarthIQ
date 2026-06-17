import type {
  RecommendationEngine as RecommendationEngineContract,
} from "@/interfaces";
import type {
  CarbonCategory,
  CarbonHotspot,
  CoreRecommendation,
  HotspotResult,
  NormalizedContextProfile,
  Recommendation,
  UserProfile,
} from "@/types";
import { ContextEngine } from "@/engines/context";

export const recommendationDataset: CoreRecommendation[] = [
  {
    id: "transport-transit-commute",
    action: "Replace two weekly car commutes with public transit",
    category: "transport",
    impact: 420,
    cost: 80,
    difficulty: 3,
    supportedBudgetLevels: ["medium", "high"],
    supportedGoals: ["reduce_emissions"],
    supportedEffortLevels: ["medium", "high"],
    explanation: "Transit substitution cuts recurring commute emissions.",
    priorityScore: 72,
  },
  {
    id: "transport-bike-short-trips",
    action: "Use a bike or walking for short trips under 3 km",
    category: "transport",
    impact: 260,
    cost: 40,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["reduce_emissions", "save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Short trip mode shifts are low-cost and easy to start.",
    priorityScore: 68,
  },
  {
    id: "transport-carpool-weekly",
    action: "Carpool once per week",
    category: "transport",
    impact: 180,
    cost: 10,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Carpooling reduces fuel use without major lifestyle changes.",
    priorityScore: 58,
  },
  {
    id: "energy-led-lighting",
    action: "Replace high-use bulbs with LEDs",
    category: "energy",
    impact: 140,
    cost: 60,
    difficulty: 1,
    supportedBudgetLevels: ["medium", "high"],
    supportedGoals: ["save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "LED upgrades are simple and lower electricity demand.",
    priorityScore: 64,
  },
  {
    id: "energy-thermostat-optimization",
    action: "Adjust heating and cooling setpoints",
    category: "energy",
    impact: 320,
    cost: 0,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["reduce_emissions", "save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Setpoint changes reduce heating and cooling load immediately.",
    priorityScore: 82,
  },
  {
    id: "energy-renewable-plan",
    action: "Switch to a renewable electricity plan",
    category: "energy",
    impact: 680,
    cost: 180,
    difficulty: 3,
    supportedBudgetLevels: ["medium", "high"],
    supportedGoals: ["reduce_emissions"],
    supportedEffortLevels: ["medium", "high"],
    explanation: "Renewable supply can reduce a large share of energy emissions.",
    priorityScore: 88,
  },
  {
    id: "diet-plant-forward-week",
    action: "Choose plant-forward meals five days per week",
    category: "diet",
    impact: 520,
    cost: 20,
    difficulty: 3,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["reduce_emissions"],
    supportedEffortLevels: ["medium", "high"],
    explanation: "Plant-forward meals reduce high-impact food emissions.",
    priorityScore: 84,
  },
  {
    id: "diet-reduce-red-meat",
    action: "Replace red meat with lower-carbon proteins",
    category: "diet",
    impact: 410,
    cost: 10,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["reduce_emissions", "save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Protein swaps offer strong diet impact with modest effort.",
    priorityScore: 80,
  },
  {
    id: "diet-food-waste-plan",
    action: "Plan meals to reduce food waste",
    category: "diet",
    impact: 190,
    cost: 0,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Meal planning saves money while reducing wasted food emissions.",
    priorityScore: 66,
  },
  {
    id: "shopping-buy-secondhand",
    action: "Buy secondhand for clothing and home goods",
    category: "shopping",
    impact: 230,
    cost: 0,
    difficulty: 2,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Secondhand buying avoids production emissions and spend.",
    priorityScore: 70,
  },
  {
    id: "shopping-repair-before-replace",
    action: "Repair electronics or appliances before replacing",
    category: "shopping",
    impact: 300,
    cost: 120,
    difficulty: 3,
    supportedBudgetLevels: ["medium", "high"],
    supportedGoals: ["reduce_emissions", "save_money"],
    supportedEffortLevels: ["medium", "high"],
    explanation: "Repairing extends product life and avoids replacement emissions.",
    priorityScore: 74,
  },
  {
    id: "shopping-30-day-rule",
    action: "Use a 30-day rule for non-essential purchases",
    category: "shopping",
    impact: 210,
    cost: 0,
    difficulty: 1,
    supportedBudgetLevels: ["low", "medium", "high"],
    supportedGoals: ["save_money", "low_effort"],
    supportedEffortLevels: ["low", "medium", "high"],
    explanation: "Delaying non-essential purchases reduces impulse consumption.",
    priorityScore: 76,
  },
];

const contextEngine = new ContextEngine();

export class RecommendationEngine implements RecommendationEngineContract {
  async generateForProfile(input: {
    hotspot: HotspotResult;
    profile: UserProfile | NormalizedContextProfile;
  }): Promise<CoreRecommendation[]> {
    const profile =
      "budgetLevel" in input.profile
        ? input.profile
        : await contextEngine.normalizeContext({ userProfile: input.profile });

    const allMatching = recommendationDataset.filter(
      (rec) =>
        rec.cost <= profile.maxRecommendationCost &&
        rec.supportedBudgetLevels.includes(profile.budgetLevel) &&
        rec.supportedEffortLevels.includes(profile.effortPreference) &&
        rec.supportedGoals.includes(profile.primaryGoal),
    );

    const hotspotMatching = allMatching.filter(
      (rec) => rec.category === input.hotspot.category,
    );

    if (hotspotMatching.length >= 4) {
      return hotspotMatching;
    }

    const secondaryMatching = allMatching.filter(
      (rec) => rec.category !== input.hotspot.category,
    );

    return [...hotspotMatching, ...secondaryMatching];
  }

  async generateRecommendations(hotspots: CarbonHotspot[]): Promise<Recommendation[]> {
    return hotspots.flatMap((hotspot) => {
      const category = hotspot.label as CarbonCategory;

      return recommendationDataset
        .filter((recommendation) => recommendation.category === category)
        .map((recommendation) => ({
          id: recommendation.id,
          organizationId: hotspot.organizationId,
          title: recommendation.action,
          rationale: `Addresses ${hotspot.label} emissions.`,
          priority: recommendation.impact >= 400 ? "high" : "medium",
          estimatedKgCo2eReduction: recommendation.impact,
          estimatedCost: recommendation.cost,
        }));
    });
  }
}
