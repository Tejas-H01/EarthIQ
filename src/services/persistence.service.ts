import type {
  AssessmentRow,
  EarthIqSupabaseClient,
  PlanRow,
  ProgressRow,
  RecommendationRow,
} from "@/lib/supabase";
import {
  AssessmentRepository,
  PlanRepository,
  ProgressRepository,
  RecommendationRepository,
  type ProgressUpdateInput,
} from "@/repositories";
import type {
  CarbonCalculationResult,
  ContextProfile,
  FourWeekSustainabilityPlan,
  HotspotResult,
  RankedRecommendation,
} from "@/types";

export interface PersistenceRepositories {
  assessments: AssessmentRepository;
  recommendations: RecommendationRepository;
  plans: PlanRepository;
  progress: ProgressRepository;
}

export class PersistenceService {
  constructor(private readonly repositories: PersistenceRepositories) {}

  async saveAssessment(input: {
    userId: string;
    carbonBreakdown: CarbonCalculationResult;
    contextProfile: ContextProfile;
    hotspot: HotspotResult | null;
  }): Promise<AssessmentRow> {
    return this.repositories.assessments.saveAssessment(input);
  }

  async loadLatestAssessment(userId: string): Promise<AssessmentRow | null> {
    return this.repositories.assessments.loadLatestAssessment(userId);
  }

  async saveRecommendations(input: {
    userId: string;
    assessmentId?: string | null;
    recommendations: RankedRecommendation[];
  }): Promise<RecommendationRow> {
    return this.repositories.recommendations.saveRecommendations(input);
  }

  async loadRecommendations(input: {
    userId: string;
    assessmentId?: string;
  }): Promise<RecommendationRow[]> {
    return this.repositories.recommendations.loadRecommendations(input);
  }

  async savePlan(input: {
    userId: string;
    recommendationSetId?: string | null;
    plan: FourWeekSustainabilityPlan;
  }): Promise<PlanRow> {
    return this.repositories.plans.savePlan(input);
  }

  async loadPlan(input: {
    userId: string;
    planId?: string;
  }): Promise<PlanRow | null> {
    return this.repositories.plans.loadPlan(input);
  }

  async updateProgress(input: ProgressUpdateInput): Promise<ProgressRow> {
    return this.repositories.progress.updateProgress(input);
  }

  async loadProgress(input: {
    userId: string;
    planId?: string;
  }): Promise<ProgressRow[]> {
    return this.repositories.progress.loadProgress(input);
  }
}

export function createPersistenceService(
  client: EarthIqSupabaseClient,
): PersistenceService {
  return new PersistenceService({
    assessments: new AssessmentRepository(client),
    recommendations: new RecommendationRepository(client),
    plans: new PlanRepository(client),
    progress: new ProgressRepository(client),
  });
}
