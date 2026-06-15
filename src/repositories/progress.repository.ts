import type {
  EarthIqSupabaseClient,
  ProgressInsert,
  ProgressRow,
} from "@/lib/supabase";
import { assertListResult, assertSingleResult } from "./utils";

export interface ProgressUpdateInput {
  userId: string;
  planId?: string | null;
  actionId: string;
  status: string;
  notes?: string | null;
  completedAt?: string | null;
}

export class ProgressRepository {
  constructor(private readonly client: EarthIqSupabaseClient) {}

  async updateProgress(input: ProgressUpdateInput): Promise<ProgressRow> {
    const payload: ProgressInsert = {
      user_id: input.userId,
      plan_id: input.planId ?? null,
      action_id: input.actionId,
      status: input.status,
      notes: input.notes ?? null,
      completed_at: input.completedAt ?? null,
    };
    const response = await this.client
      .from("progress")
      .upsert(payload, { onConflict: "user_id,action_id" })
      .select("*")
      .single();

    return assertSingleResult(response, "updateProgress");
  }

  async loadProgress(input: {
    userId: string;
    planId?: string;
  }): Promise<ProgressRow[]> {
    let query = this.client
      .from("progress")
      .select("*")
      .eq("user_id", input.userId);

    if (input.planId) {
      query = query.eq("plan_id", input.planId);
    }

    const response = await query.order("created_at", { ascending: true });

    return assertListResult(response, "loadProgress");
  }
}
