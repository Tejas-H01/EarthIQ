import {
  CarbonEngine,
  ContextEngine,
  DecisionReportEngine,
  HotspotEngine,
  PlannerEngine,
  RankingEngine,
  RecommendationEngine,
} from "@/engines";
import { CoachContextBuilder, CoachService } from "@/services";
import type { GeminiClient } from "@/lib/ai";
import type {
  CoachContext,
  CoachResponse,
  ContextProfile,
  DecisionReport,
  EffortPreference,
  FourWeekSustainabilityPlan,
  PrimaryGoal,
  ProgressSnapshot,
  RankedRecommendation,
  UserProfile,
} from "@/types";

export interface AssessmentFormState {
  name: string;
  profileType: string;
  weeklyTransportKm: number;
  monthlyEnergyKwh: number;
  weeklyDietKgCo2e: number;
  monthlyShoppingSpend: number;
  budget: number;
  primaryGoal: PrimaryGoal;
  effortPreference: EffortPreference;
}

export interface EarthIqAssessmentResult {
  userProfile: UserProfile;
  contextProfile: ContextProfile;
  carbonBreakdown: {
    categories: {
      transport: number;
      energy: number;
      diet: number;
      shopping: number;
    };
    total: number;
  };
  hotspot: {
    category: "transport" | "energy" | "diet" | "shopping";
    percentageContribution: number;
  };
  recommendations: RankedRecommendation[];
  plan: FourWeekSustainabilityPlan;
  decisionReport: DecisionReport;
  coachContext: CoachContext;
}

export interface ProgressSummary {
  savedEmissions: number;
  completedActions: RankedRecommendation[];
  streakWeeks: number;
}

const emissionFactors = {
  transportKgCo2ePerKm: 0.192,
  energyKgCo2ePerKwh: 0.42,
  shoppingKgCo2ePerCurrencyUnit: 0.28,
};

export function getDefaultAssessmentForm(): AssessmentFormState {
  return {
    name: "EarthIQ member",
    profileType: "household",
    weeklyTransportKm: 120,
    monthlyEnergyKwh: 320,
    weeklyDietKgCo2e: 42,
    monthlyShoppingSpend: 420,
    budget: 100,
    primaryGoal: "save_money",
    effortPreference: "low",
  };
}

export class EarthIqApplicationService {
  private readonly carbonEngine = new CarbonEngine();
  private readonly hotspotEngine = new HotspotEngine();
  private readonly contextEngine = new ContextEngine();
  private readonly recommendationEngine = new RecommendationEngine();
  private readonly rankingEngine = new RankingEngine();
  private readonly plannerEngine = new PlannerEngine();
  private readonly reportEngine = new DecisionReportEngine();
  private readonly coachContextBuilder = new CoachContextBuilder();

  async generateAssessment(
    form: AssessmentFormState,
  ): Promise<EarthIqAssessmentResult> {
    const userProfile: UserProfile = {
      budget: form.budget,
      primaryGoal: form.primaryGoal,
      effortPreference: form.effortPreference,
    };
    const contextProfile = await this.contextEngine.normalizeContext({
      userProfile,
    });
    const carbonBreakdown = await this.carbonEngine.calculateAnnualEmissions({
      transport: {
        weeklyDistanceKm: form.weeklyTransportKm,
        kgCo2ePerKm: emissionFactors.transportKgCo2ePerKm,
      },
      energy: {
        monthlyKwh: form.monthlyEnergyKwh,
        kgCo2ePerKwh: emissionFactors.energyKgCo2ePerKwh,
      },
      diet: {
        weeklyKgCo2e: form.weeklyDietKgCo2e,
      },
      shopping: {
        monthlySpend: form.monthlyShoppingSpend,
        kgCo2ePerCurrencyUnit: emissionFactors.shoppingKgCo2ePerCurrencyUnit,
      },
    });
    const hotspot =
      await this.hotspotEngine.identifyHighestCategory(carbonBreakdown);
    const candidateRecommendations =
      await this.recommendationEngine.generateForProfile({
        hotspot,
        profile: contextProfile,
      });
    const recommendations = await this.rankingEngine.rankRecommendations({
      recommendations: candidateRecommendations,
      profile: contextProfile,
    });
    const plan = await this.plannerEngine.generateFourWeekPlan({
      recommendations,
    });
    const decisionReport = this.reportEngine.generateReport({
      userProfile,
      context: contextProfile,
      carbonBreakdown,
      hotspot,
      recommendations,
    });
    const coachContext = this.coachContextBuilder.build({
      userProfile,
      latestAssessment: {
        carbonBreakdown,
        contextProfile,
        hotspot,
      },
      recommendations,
      plan,
      progress: [],
      decisionReport,
    });

    return {
      userProfile,
      contextProfile,
      carbonBreakdown,
      hotspot,
      recommendations,
      plan,
      decisionReport,
      coachContext,
    };
  }
}

export function summarizeProgress(input: {
  recommendations: RankedRecommendation[];
  completedActionIds: string[];
}): ProgressSummary {
  const completedActions = input.recommendations.filter((recommendation) =>
    input.completedActionIds.includes(recommendation.id),
  );
  const savedEmissions = completedActions.reduce(
    (sum, recommendation) => sum + recommendation.impact,
    0,
  );

  return {
    savedEmissions,
    completedActions,
    streakWeeks: completedActions.length,
  };
}

export function buildProgressSnapshots(
  completedActionIds: string[],
): ProgressSnapshot[] {
  return completedActionIds.map((actionId) => ({
    actionId,
    status: "completed",
  }));
}

export function createDemoCoachClient(): GeminiClient {
  return {
    async generateText(request) {
      const parsed = JSON.parse(request.prompt) as {
        responseType: string;
        emissions: { hotspot: string | null };
        topRecommendations: Array<{
          action: string;
          annualReductionKg: number;
        }>;
        progress: Array<{ status: string }>;
      };
      const topAction = parsed.topRecommendations[0];
      const hotspot = parsed.emissions.hotspot ?? "your current footprint";

      return {
        model: "gemini-ready-demo",
        text: topAction
          ? `Focus on ${topAction.action}. EarthIQ selected it because ${hotspot} is the priority area, and it can reduce about ${topAction.annualReductionKg} kg CO2e annually. You have ${parsed.progress.length} progress update${parsed.progress.length === 1 ? "" : "s"} recorded, so keep the next step small and measurable.`
          : "EarthIQ needs an assessment and recommendations before I can give personalized coaching. Start with the assessment flow, then I can explain the best next action.",
      };
    },
  };
}

export async function askCoach(input: {
  question: string;
  result: EarthIqAssessmentResult;
  completedActionIds: string[];
}): Promise<CoachResponse> {
  const service = new CoachService(createDemoCoachClient());
  const context = {
    ...input.result.coachContext,
    progress: buildProgressSnapshots(input.completedActionIds),
  };

  return service.askWithContext({
    question: input.question,
    context,
  });
}
