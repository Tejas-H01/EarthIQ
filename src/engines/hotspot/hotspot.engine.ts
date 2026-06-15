import type { HotspotEngine as HotspotEngineContract } from "@/interfaces";
import type {
  CarbonCalculationResult,
  CarbonEstimate,
  CarbonHotspot,
  HotspotResult,
} from "@/types";

export class HotspotEngine implements HotspotEngineContract {
  async identifyHighestCategory(
    result: CarbonCalculationResult,
  ): Promise<HotspotResult> {
    const entries = Object.entries(result.categories) as Array<
      [HotspotResult["category"], number]
    >;
    const [category, kgCo2e] = entries.reduce(
      (highest, current) => (current[1] > highest[1] ? current : highest),
      entries[0],
    );

    return {
      category,
      percentageContribution:
        result.total === 0 ? 0 : Number(((kgCo2e / result.total) * 100).toFixed(2)),
    };
  }

  async detectHotspots(estimates: CarbonEstimate[]): Promise<CarbonHotspot[]> {
    const total = estimates.reduce((sum, estimate) => sum + estimate.kgCo2e, 0);

    return estimates
      .map((estimate) => ({
        id: estimate.activityId,
        organizationId: "",
        label: estimate.activityId,
        kgCo2e: estimate.kgCo2e,
        shareOfTotal: total === 0 ? 0 : estimate.kgCo2e / total,
        scope: estimate.scope,
        drivers: [estimate.factorId ?? "unmatched_factor"],
      }))
      .sort((left, right) => right.kgCo2e - left.kgCo2e);
  }
}
