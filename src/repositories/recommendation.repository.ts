import type {
  EarthIqSupabaseClient,
  RecommendationInsert,
  RecommendationRow,
} from "@/lib/supabase";
import type { RankedRecommendation } from "@/types";
import { assertListResult, assertSingleResult, toJson } from "./utils";

export class RecommendationRepository {
  constructor(private readonly client: EarthIqSupabaseClient) {}

  async saveRecommendations(input: {
    userId: string;
    assessmentId?: string | null;
    recommendations: RankedRecommendation[];
  }): Promise<RecommendationRow> {
    const payload: RecommendationInsert = {
      user_id: input.userId,
      assessment_id: input.assessmentId ?? null,
      recommendations: toJson(input.recommendations),
    };
    const response = await this.client
      .from("recommendations")
      .insert(payload)
      .select("*")
      .single();

    return assertSingleResult(response, "saveRecommendations");
  }

  async loadRecommendations(input: {
    userId: string;
    assessmentId?: string;
  }): Promise<RecommendationRow[]> {
    let query = this.client
      .from("recommendations")
      .select("*")
      .eq("user_id", input.userId);

    if (input.assessmentId) {
      query = query.eq("assessment_id", input.assessmentId);
    }

    const response = await query.order("created_at", { ascending: false });

    return assertListResult(response, "loadRecommendations");
  }
}
