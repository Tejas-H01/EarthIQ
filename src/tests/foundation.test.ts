import { describe, expect, it } from "vitest";
import { activityRecordSchema } from "@/schemas";
import { CarbonEngine } from "@/engines";

describe("EarthIQ foundation", () => {
  it("validates activity records with Zod", () => {
    const activity = activityRecordSchema.parse({
      id: "activity-1",
      organizationId: "org-1",
      source: "utility_bill",
      category: "electricity",
      quantity: 1200,
      unit: "kWh",
      occurredAt: "2026-06-16T00:00:00.000Z",
    });

    expect(activity.category).toBe("electricity");
  });

  it("calculates legacy activity estimates from matching factors", async () => {
    const engine = new CarbonEngine();

    await expect(
      engine.calculateEmissions(
        [
          {
            id: "activity-1",
            organizationId: "org-1",
            source: "utility_bill",
            category: "electricity",
            quantity: 100,
            unit: "kWh",
            occurredAt: "2026-06-16T00:00:00.000Z",
          },
        ],
        [
          {
            id: "factor-1",
            source: "grid",
            category: "electricity",
            unit: "kWh",
            kgCo2ePerUnit: 0.5,
            scope: "scope_2",
          },
        ],
      ),
    ).resolves.toEqual([
      {
        activityId: "activity-1",
        kgCo2e: 50,
        scope: "scope_2",
        factorId: "factor-1",
        confidence: 1,
      },
    ]);
  });
});
