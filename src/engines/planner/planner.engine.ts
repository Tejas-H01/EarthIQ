import type { PlannerEngine as PlannerEngineContract } from "@/interfaces";
import type {
  EntityId,
  FourWeekSustainabilityPlan,
  PlanningHorizon,
  RankedRecommendation,
  Recommendation,
  SustainabilityPlan,
} from "@/types";
import { EngineNotImplementedError } from "@/lib/errors";

export class PlannerEngine implements PlannerEngineContract {
  async generateFourWeekPlan(input: {
    recommendations: RankedRecommendation[];
  }): Promise<FourWeekSustainabilityPlan> {
    const hotspotCategory = input.recommendations[0]?.category;

    const remaining = Array.from(
      new Map(
        input.recommendations.map((recommendation) => [
          recommendation.action,
          recommendation,
        ]),
      ).values(),
    ).sort((left, right) => {
      if (hotspotCategory) {
        const leftIsHotspot = left.category === hotspotCategory;
        const rightIsHotspot = right.category === hotspotCategory;
        if (leftIsHotspot && !rightIsHotspot) return -1;
        if (!leftIsHotspot && rightIsHotspot) return 1;
      }
      return (
        left.difficulty - right.difficulty ||
        right.impactScore - left.impactScore
      );
    });

    const selected: RankedRecommendation[] = [];

    while (selected.length < 4 && remaining.length > 0) {
      const previous = selected.at(-1);
      const previousDifficulty = previous?.difficulty ?? 0;
      const nonRepeatingProgressiveIndex = remaining.findIndex(
        (recommendation) =>
          recommendation.category !== previous?.category &&
          recommendation.difficulty >= previousDifficulty,
      );
      const nonRepeatingIndex = remaining.findIndex(
        (recommendation) => recommendation.category !== previous?.category,
      );
      const index =
        nonRepeatingProgressiveIndex >= 0
          ? nonRepeatingProgressiveIndex
          : nonRepeatingIndex >= 0
            ? nonRepeatingIndex
            : 0;
      const [next] = remaining.splice(index, 1);

      if (next) {
        selected.push(next);
      }
    }

    return {
      weeks: Array.from({ length: 4 }, (_, index) => ({
        week: index + 1,
        actions: selected[index] ? [selected[index]] : [],
      })),
    };
  }

  async createPlan(_input: {
    organizationId: EntityId;
    horizon: PlanningHorizon;
    recommendations: Recommendation[];
  }): Promise<SustainabilityPlan> {
    void _input;

    throw new EngineNotImplementedError("PlannerEngine", "createPlan");
  }
}
