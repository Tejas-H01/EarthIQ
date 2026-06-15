import type {
  EarthIqSupabaseClient,
  ProfileInsert,
  ProfileRow,
  ProfileUpdate,
} from "@/lib/supabase";
import { assertSingleResult } from "./utils";

export class ProfileRepository {
  constructor(private readonly client: EarthIqSupabaseClient) {}

  async upsertProfile(profile: ProfileInsert): Promise<ProfileRow> {
    const response = await this.client
      .from("profiles")
      .upsert(profile, { onConflict: "user_id" })
      .select("*")
      .single();

    return assertSingleResult(response, "upsertProfile");
  }

  async getProfile(userId: string): Promise<ProfileRow | null> {
    const response = await this.client
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (response.error) {
      throw new Error(`getProfile failed: ${response.error.message}`);
    }

    return response.data;
  }

  async updateProfile(
    userId: string,
    updates: ProfileUpdate,
  ): Promise<ProfileRow> {
    const response = await this.client
      .from("profiles")
      .update(updates)
      .eq("user_id", userId)
      .select("*")
      .single();

    return assertSingleResult(response, "updateProfile");
  }
}
