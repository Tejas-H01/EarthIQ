import type {
  ActivityRecord,
  AiCoachMessage,
  CarbonCalculationResult,
  CarbonCalculatorInput,
  CarbonEstimate,
  CarbonHotspot,
  ContextProfile,
  ContextEngineInput,
  CoreRecommendation,
  AIContextPayload,
  DecisionReport,
  EmissionFactor,
  EntityId,
  ExplanationResult,
  FourWeekSustainabilityPlan,
  HotspotResult,
  NormalizedContextProfile,
  PlanningHorizon,
  RankedRecommendation,
  Recommendation,
  RoiEstimate,
  SustainabilityPlan,
  UserProfile,
} from "@/types";

export interface CarbonEngine {
  calculateAnnualEmissions(
    input: CarbonCalculatorInput,
  ): Promise<CarbonCalculationResult>;

  calculateEmissions(
    activities: ActivityRecord[],
    factors: EmissionFactor[],
  ): Promise<CarbonEstimate[]>;
}

export interface HotspotEngine {
  identifyHighestCategory(result: CarbonCalculationResult): Promise<HotspotResult>;

  detectHotspots(estimates: CarbonEstimate[]): Promise<CarbonHotspot[]>;
}

export interface ContextEngine {
  normalizeContext(input: ContextEngineInput): Promise<NormalizedContextProfile>;
}

export interface RecommendationEngine {
  generateForProfile(input: {
    hotspot: HotspotResult;
    profile: UserProfile | NormalizedContextProfile;
  }): Promise<CoreRecommendation[]>;

  generateRecommendations(hotspots: CarbonHotspot[]): Promise<Recommendation[]>;
}

export interface RankingEngine {
  rankRecommendations(input: {
    recommendations: CoreRecommendation[];
    profile: UserProfile | NormalizedContextProfile;
  }): Promise<RankedRecommendation[]>;
}

export interface PlannerEngine {
  generateFourWeekPlan(input: {
    recommendations: RankedRecommendation[];
  }): Promise<FourWeekSustainabilityPlan>;

  createPlan(input: {
    organizationId: EntityId;
    horizon: PlanningHorizon;
    recommendations: Recommendation[];
  }): Promise<SustainabilityPlan>;
}

export interface RoiEngine {
  estimateRoi(recommendations: Recommendation[]): Promise<RoiEstimate[]>;
}

export interface AiCoach {
  respond(messages: AiCoachMessage[]): Promise<AiCoachMessage>;
}

export interface IExplanationEngine {
  explainRecommendation(input: {
    context: ContextProfile;
    carbonBreakdown: CarbonCalculationResult;
    hotspot: HotspotResult | null;
    recommendation: CoreRecommendation;
  }): ExplanationResult;
}

export interface IDecisionReportEngine {
  generateReport(input: {
    userProfile: UserProfile;
    context: ContextProfile;
    carbonBreakdown: CarbonCalculationResult;
    hotspot: HotspotResult | null;
    recommendations: RankedRecommendation[];
  }): DecisionReport;
}

export interface IAIContextBuilder {
  build(input: {
    report: DecisionReport;
    context: ContextProfile;
  }): AIContextPayload;
}
