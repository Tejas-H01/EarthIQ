import { describe, it } from "vitest";
import { EarthIqApplicationService, askCoach, type AssessmentFormState } from "@/application";
import * as fs from "fs";
import * as path from "path";

describe("EarthIQ Personalization Audit Run", () => {
  it("runs the audit for 3 profiles", async () => {
    const service = new EarthIqApplicationService();

    const profiles: Record<string, AssessmentFormState> = {
      "Urban Commuter (Transport Hotspot)": {
        name: "Commuter Pat",
        profileType: "individual",
        weeklyTransportKm: 800,
        monthlyEnergyKwh: 50,
        weeklyDietKgCo2e: 10,
        monthlyShoppingSpend: 100,
        budget: 250,
        primaryGoal: "reduce_emissions",
        effortPreference: "high",
      },
      "Suburban Homeowner (Energy Hotspot)": {
        name: "Suburban Sam",
        profileType: "household",
        weeklyTransportKm: 20,
        monthlyEnergyKwh: 1200,
        weeklyDietKgCo2e: 15,
        monthlyShoppingSpend: 50,
        budget: 400,
        primaryGoal: "save_money",
        effortPreference: "medium",
      },
      "Rural Carnivore (Diet Hotspot)": {
        name: "Rural Rob",
        profileType: "individual",
        weeklyTransportKm: 50,
        monthlyEnergyKwh: 150,
        weeklyDietKgCo2e: 90,
        monthlyShoppingSpend: 30,
        budget: 15,
        primaryGoal: "low_effort",
        effortPreference: "low",
      },
    };

    const results: Record<string, any> = {};

    for (const [profileName, form] of Object.entries(profiles)) {
      const result = await service.generateAssessment(form);
      const coachResponse = await askCoach({
        question: "What is my focus for this week?",
        result,
        completedActionIds: [],
      });

      results[profileName] = {
        carbonBreakdown: result.carbonBreakdown,
        hotspot: result.hotspot,
        recommendations: result.recommendations,
        plan: result.plan,
        missionControlData: {
          footprintTons: result.carbonBreakdown.total / 1000,
          hotspotContribution: result.hotspot.percentageContribution,
          bestAction: result.decisionReport.bestAction,
          projectedReduction: result.decisionReport.projectedReduction,
        },
        coachResponse,
        decisionReport: result.decisionReport,
      };
    }

    fs.writeFileSync(
      path.join(__dirname, "audit-results.json"),
      JSON.stringify(results, null, 2)
    );
  });
});
