import type {
  AssessmentInsert,
  AssessmentRow,
  EarthIqSupabaseClient,
} from "@/lib/supabase";
import type {
  CarbonCalculationResult,
  ContextProfile,
  HotspotResult,
} from "@/types";
import { assertSingleResult, toJson } from "./utils";

export class AssessmentRepository {
  constructor(private readonly client: EarthIqSupabaseClient) {}

  async saveAssessment(input: {
    userId: string;
    carbonBreakdown: CarbonCalculationResult;
    contextProfile: ContextProfile;
    hotspot: HotspotResult | null;
  }): Promise<AssessmentRow> {
    const payload: AssessmentInsert = {
      user_id: input.userId,
      carbon_breakdown: toJson(input.carbonBreakdown),
      context_profile: toJson(input.contextProfile),
      hotspot: input.hotspot ? toJson(input.hotspot) : null,
    };
    const response = await this.client
      .from("assessments")
      .insert(payload)
      .select("*")
      .single();

    return assertSingleResult(response, "saveAssessment");
  }

  async loadLatestAssessment(userId: string): Promise<AssessmentRow | null> {
    const response = await this.client
      .from("assessments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(`loadLatestAssessment failed: ${response.error.message}`);
    }

    return response.data;
  }

  async loadAssessmentHistory(userId: string): Promise<AssessmentRow[]> {
    const response = await this.client
      .from("assessments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(`loadAssessmentHistory failed: ${response.error.message}`);
    }

    return response.data || [];
  }
}
