import type { CarbonEngine as CarbonEngineContract } from "@/interfaces";
import type {
  ActivityRecord,
  CarbonCalculationResult,
  CarbonCalculatorInput,
  CarbonEstimate,
  EmissionFactor,
} from "@/types";

export class CarbonEngine implements CarbonEngineContract {
  async calculateAnnualEmissions(
    input: CarbonCalculatorInput,
  ): Promise<CarbonCalculationResult> {
    const categories = {
      transport: input.transport.weeklyDistanceKm * input.transport.kgCo2ePerKm * 52,
      energy: input.energy.monthlyKwh * input.energy.kgCo2ePerKwh * 12,
      diet: input.diet.weeklyKgCo2e * 52,
      shopping:
        input.shopping.monthlySpend *
        input.shopping.kgCo2ePerCurrencyUnit *
        12,
    };

    return {
      categories,
      total: Object.values(categories).reduce((sum, value) => sum + value, 0),
    };
  }

  async calculateEmissions(
    activities: ActivityRecord[],
    factors: EmissionFactor[],
  ): Promise<CarbonEstimate[]> {
    return activities.map((activity) => {
      const factor = factors.find(
        (candidate) =>
          candidate.category === activity.category &&
          candidate.unit === activity.unit,
      );

      return {
        activityId: activity.id,
        kgCo2e: factor ? activity.quantity * factor.kgCo2ePerUnit : 0,
        scope: factor?.scope ?? "scope_3",
        factorId: factor?.id,
        confidence: factor ? 1 : 0,
      };
    });
  }
}
