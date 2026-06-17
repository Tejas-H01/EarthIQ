import type {
  EarthIqSupabaseClient,
  PlanInsert,
  PlanRow,
} from "@/lib/supabase";
import type { FourWeekSustainabilityPlan } from "@/types";
import { assertSingleResult, toJson } from "./utils";

export class PlanRepository {
  constructor(private readonly client: EarthIqSupabaseClient) {}

  async savePlan(input: {
    userId: string;
    recommendationSetId?: string | null;
    plan: FourWeekSustainabilityPlan;
  }): Promise<PlanRow> {
    const payload: PlanInsert = {
      user_id: input.userId,
      recommendation_set_id: input.recommendationSetId ?? null,
      plan: toJson(input.plan),
    };
    const response = await this.client
      .from("plans")
      .insert(payload)
      .select("*")
      .single();

    return assertSingleResult(response, "savePlan");
  }

  async loadPlan(input: {
    userId: string;
    planId?: string;
  }): Promise<PlanRow | null> {
    let query = this.client.from("plans").select("*").eq("user_id", input.userId);

    if (input.planId) {
      query = query.eq("id", input.planId);
    }

    const response = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(`loadPlan failed: ${response.error.message}`);
    }

    return response.data;
  }

  async loadPlanHistory(userId: string): Promise<PlanRow[]> {
    const response = await this.client
      .from("plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(`loadPlanHistory failed: ${response.error.message}`);
    }

    return response.data || [];
  }
}
