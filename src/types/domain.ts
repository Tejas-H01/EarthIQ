export type EntityId = string;
export type IsoDateString = string;

export type EmissionScope = "scope_1" | "scope_2" | "scope_3";
export type RecommendationPriority = "low" | "medium" | "high" | "critical";
export type PlanningHorizon = "quarter" | "year" | "three_years" | "five_years";

export interface Organization {
  id: EntityId;
  name: string;
  industry?: string;
  region?: string;
  createdAt: IsoDateString;
}

export interface ActivityRecord {
  id: EntityId;
  organizationId: EntityId;
  source: string;
  category: string;
  quantity: number;
  unit: string;
  occurredAt: IsoDateString;
  metadata?: Record<string, unknown>;
}

export interface EmissionFactor {
  id: EntityId;
  source: string;
  category: string;
  unit: string;
  kgCo2ePerUnit: number;
  scope: EmissionScope;
  region?: string;
  effectiveFrom?: IsoDateString;
}

export interface CarbonEstimate {
  activityId: EntityId;
  kgCo2e: number;
  scope: EmissionScope;
  factorId?: EntityId;
  confidence: number;
}

export interface CarbonHotspot {
  id: EntityId;
  organizationId: EntityId;
  label: string;
  kgCo2e: number;
  shareOfTotal: number;
  scope?: EmissionScope;
  drivers: string[];
}

export interface Recommendation {
  id: EntityId;
  organizationId: EntityId;
  title: string;
  rationale: string;
  priority: RecommendationPriority;
  estimatedKgCo2eReduction?: number;
  estimatedCost?: number;
}

export interface PlannerMilestone {
  id: EntityId;
  title: string;
  targetDate: IsoDateString;
  dependencies?: EntityId[];
}

export interface SustainabilityPlan {
  id: EntityId;
  organizationId: EntityId;
  horizon: PlanningHorizon;
  milestones: PlannerMilestone[];
  recommendations: Recommendation[];
}

export interface RoiEstimate {
  recommendationId: EntityId;
  paybackMonths?: number;
  netPresentValue?: number;
  internalRateOfReturn?: number;
  assumptions: Record<string, unknown>;
}

export interface AiCoachMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type CarbonCategory = "transport" | "energy" | "diet" | "shopping";

export type PrimaryGoal = "reduce_emissions" | "save_money" | "low_effort";
export type EffortPreference = "low" | "medium" | "high";
export type BudgetLevel = "low" | "medium" | "high";

export interface CarbonCalculatorInput {
  transport: {
    weeklyDistanceKm: number;
    kgCo2ePerKm: number;
  };
  energy: {
    monthlyKwh: number;
    kgCo2ePerKwh: number;
  };
  diet: {
    weeklyKgCo2e: number;
  };
  shopping: {
    monthlySpend: number;
    kgCo2ePerCurrencyUnit: number;
  };
}

export type CarbonCategoryTotals = Record<CarbonCategory, number>;

export interface CarbonCalculationResult {
  categories: CarbonCategoryTotals;
  total: number;
}

export interface HotspotResult {
  category: CarbonCategory;
  percentageContribution: number;
}

export interface UserProfile {
  budget: number;
  primaryGoal: PrimaryGoal;
  effortPreference: EffortPreference;
}

export interface ContextEngineInput {
  userProfile: UserProfile;
  budgetLevel?: BudgetLevel;
  effortPreference?: EffortPreference;
  primaryGoal?: PrimaryGoal;
}

export interface NormalizedContextProfile {
  budget: number;
  budgetLevel: BudgetLevel;
  maxRecommendationCost: number;
  primaryGoal: PrimaryGoal;
  effortPreference: EffortPreference;
}

export interface CoreRecommendation {
  id: EntityId;
  action: string;
  category: CarbonCategory;
  impact: number;
  cost: number;
  difficulty: number;
  supportedBudgetLevels: BudgetLevel[];
  supportedGoals: PrimaryGoal[];
  supportedEffortLevels: EffortPreference[];
  explanation: string;
  priorityScore: number;
}

export interface RankedRecommendation extends CoreRecommendation {
  impactScore: number;
  goalAlignment: number;
  budgetCompatibility: number;
}

export interface PlannerWeek {
  week: number;
  actions: RankedRecommendation[];
}

export interface FourWeekSustainabilityPlan {
  weeks: PlannerWeek[];
}

export type ContextProfile = NormalizedContextProfile;
export type CarbonBreakdown = CarbonCalculationResult;

export interface SuitabilityResult {
  budgetCompatible: boolean;
  goalAligned: boolean;
  effortCompatible: boolean;
}

export interface ExplanationResult {
  title: string;
  summary: string;
  reasoning: string[];
  projectedImpact: {
    annualReductionKg: number;
  };
  suitability: SuitabilityResult;
}

export interface RecommendationSummary {
  id: EntityId;
  action: string;
  category: CarbonCategory;
  impact: number;
  priorityScore: number;
  explanation: ExplanationResult;
}

export interface DecisionReport {
  totalEmissions: number;
  largestEmissionSource: CarbonCategory | null;
  hotspotPercentage: number;
  bestAction: {
    action: string;
    impact: number;
  } | null;
  projectedReduction: number;
  keyInsights: string[];
  recommendationSummaries: RecommendationSummary[];
}

export interface AIContextPayload {
  userType: string;
  primaryGoal: PrimaryGoal;
  emissions: {
    total: number;
    hotspot: CarbonCategory | null;
  };
  topRecommendations: Array<{
    action: string;
    category: CarbonCategory;
    impact: number;
    priorityScore: number;
  }>;
  reasoning: string[];
  plannerSummary: string[];
}

export type CoachQuestionCategory =
  | "recommendation"
  | "progress"
  | "footprint"
  | "planning"
  | "general";

export type CoachResponseType =
  | "weekly_focus"
  | "progress_summary"
  | "recommendation_explanation"
  | "sustainability_advice"
  | "goal_planning";

export interface LatestAssessmentSnapshot {
  carbonBreakdown: CarbonBreakdown;
  contextProfile: ContextProfile;
  hotspot: HotspotResult | null;
}

export interface ProgressSnapshot {
  actionId: EntityId;
  status: string;
  notes?: string | null;
  completedAt?: IsoDateString | null;
}

export interface CoachContextRecommendation {
  action: string;
  category: CarbonCategory;
  impact: number;
  reasoning: string[];
  suitability: SuitabilityResult;
}

export interface CoachContext {
  userProfile: UserProfile;
  contextProfile: ContextProfile;
  emissions: {
    total: number;
    hotspot: CarbonCategory | null;
    hotspotPercentage: number;
  };
  recommendations: CoachContextRecommendation[];
  plan: Array<{
    week: number;
    actions: string[];
  }>;
  progress: ProgressSnapshot[];
  decisionInsights: string[];
}

export interface CoachContextBuilderInput {
  userProfile: UserProfile;
  latestAssessment: LatestAssessmentSnapshot | null;
  recommendations: RankedRecommendation[];
  plan: FourWeekSustainabilityPlan | null;
  progress: ProgressSnapshot[];
  decisionReport: DecisionReport | null;
}

export interface CoachPrompt {
  systemInstruction: string;
  prompt: string;
  category: CoachQuestionCategory;
  responseType: CoachResponseType;
}

export interface CoachResponse {
  type: CoachResponseType;
  category: CoachQuestionCategory;
  answer: string;
  model: string;
  grounding: {
    hotspot: CarbonCategory | null;
    recommendationCount: number;
    progressCount: number;
  };
}
