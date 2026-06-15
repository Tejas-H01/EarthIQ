import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import { MissingConfigurationError } from "@/lib/errors";
import type { EarthIqDatabase } from "./database.types";

export type EarthIqSupabaseClient = SupabaseClient<EarthIqDatabase>;

export function createSupabaseBrowserClient(): SupabaseClient<EarthIqDatabase> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new MissingConfigurationError("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new MissingConfigurationError("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient<EarthIqDatabase>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createSupabaseServiceClient(): SupabaseClient<EarthIqDatabase> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new MissingConfigurationError("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new MissingConfigurationError("SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<EarthIqDatabase>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
