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
    const sortedRecommendations = [...recommendations].sort((a, b) => {
      const aIsHotspot = a.category === hotspot.category;
      const bIsHotspot = b.category === hotspot.category;
      if (aIsHotspot && !bIsHotspot) return -1;
      if (!aIsHotspot && bIsHotspot) return 1;
      return 0;
    });
    const plan = await this.plannerEngine.generateFourWeekPlan({
      recommendations: sortedRecommendations,
    });
    const decisionReport = this.reportEngine.generateReport({
      userProfile,
      context: contextProfile,
      carbonBreakdown,
      hotspot,
      recommendations: sortedRecommendations,
    });
    const coachContext = this.coachContextBuilder.build({
      userProfile,
      latestAssessment: {
        carbonBreakdown,
        contextProfile,
        hotspot,
      },
      recommendations: sortedRecommendations,
      plan,
      progress: [],
      decisionReport,
    });

    return {
      userProfile,
      contextProfile,
      carbonBreakdown,
      hotspot,
      recommendations: sortedRecommendations,
      plan,
      decisionReport,
      coachContext,
    };
  }

  rebuildAssessmentResult(input: {
    userProfile: UserProfile;
    contextProfile: ContextProfile;
    carbonBreakdown: any;
    hotspot: any;
    recommendations: RankedRecommendation[];
    plan: FourWeekSustainabilityPlan;
    completedActionIds?: string[];
  }): EarthIqAssessmentResult {
    const decisionReport = this.reportEngine.generateReport({
      userProfile: input.userProfile,
      context: input.contextProfile,
      carbonBreakdown: input.carbonBreakdown,
      hotspot: input.hotspot,
      recommendations: input.recommendations,
    });
    const progressSnapshots = (input.completedActionIds || []).map((actionId) => ({
      actionId,
      status: "completed",
    }));
    const coachContext = this.coachContextBuilder.build({
      userProfile: input.userProfile,
      latestAssessment: {
        carbonBreakdown: input.carbonBreakdown,
        contextProfile: input.contextProfile,
        hotspot: input.hotspot,
      },
      recommendations: input.recommendations,
      plan: input.plan,
      progress: progressSnapshots,
      decisionReport,
    });
    return {
      userProfile: input.userProfile,
      contextProfile: input.contextProfile,
      carbonBreakdown: input.carbonBreakdown,
      hotspot: input.hotspot,
      recommendations: input.recommendations,
      plan: input.plan,
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
        question: string;
        responseType: string;
        userGoals: {
          primaryGoal: string;
          effortPreference: string;
          budgetLevel: string;
          maxRecommendationCost: number;
        };
        emissions: { total: number; hotspot: string | null };
        topRecommendations: Array<{
          action: string;
          category: string;
          annualReductionKg: number;
          suitability: {
            budgetCompatible: boolean;
            goalAligned: boolean;
            effortCompatible: boolean;
          };
        }>;
        progress: Array<{ actionId: string; status: string }>;
      };

      const topAction = parsed.topRecommendations[0];
      const hotspot = parsed.emissions.hotspot ?? "your current footprint";
      const progressCount = parsed.progress.length;
      const primaryGoal = parsed.userGoals?.primaryGoal || "save_money";
      const effort = parsed.userGoals?.effortPreference || "low";

      if (!topAction) {
        return {
          model: "gemini-ready-demo",
          text: "EarthIQ needs an assessment and recommendations before I can give personalized coaching. Start with the assessment flow, then I can explain the best next action.",
        };
      }

      let text = "";
      if (parsed.responseType === "recommendation_explanation") {
        text = `Regarding your recommendation: Focus on **${topAction.action}**. EarthIQ selected it because **${hotspot}** is your priority area, and implementing this action can reduce about **${topAction.annualReductionKg} kg CO2e** annually. This action was chosen specifically because it matches your preference for ${effort.replaceAll("_", " ")} effort and aligns perfectly with your goal to ${primaryGoal.replaceAll("_", " ")}.`;
      } else if (parsed.responseType === "progress_summary") {
        if (progressCount === 0) {
          text = `You haven't completed any actions yet, but don't worry! EarthIQ selected it as a progressive milestone starting with **${topAction.action}**. Let's check off this first action to kickstart your savings and reduce your ${hotspot} emissions!`;
        } else {
          text = `Excellent job! You have completed **${progressCount} action${progressCount === 1 ? "" : "s"}** so far. EarthIQ selected it as a progressive milestone. By tracking these small steps, you are actively driving down your **${hotspot}** emissions. Keep the momentum going!`;
        }
      } else if (parsed.responseType === "sustainability_advice") {
        text = `Looking at your emissions profile, **${hotspot}** is your largest impact category. EarthIQ selected it as the primary hotspot to target. By focusing your efforts here with high-impact swaps like **${topAction.action}**, you'll see the steepest reduction in your annual carbon footprint.`;
      } else if (parsed.responseType === "goal_planning") {
        text = `Your 4-week plan is structured progressively to match a ${effort.replaceAll("_", " ")} effort preference. EarthIQ selected it to avoid overwhelming you. Week 1 starts with the most accessible, high-impact action (**${topAction.action}**) and builds momentum from there.`;
      } else {
        text = `Focus on **${topAction.action}**. EarthIQ selected it because **${hotspot}** is the priority area, and it can reduce about **${topAction.annualReductionKg} kg CO2e** annually. You have **${progressCount} progress update${progressCount === 1 ? "" : "s"}** recorded, so keep the next step small and measurable.`;
      }

      return {
        model: "gemini-ready-demo",
        text,
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
