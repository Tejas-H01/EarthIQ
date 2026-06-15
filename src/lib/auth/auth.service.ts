import type { Session, User } from "@supabase/supabase-js";
import type { EarthIqSupabaseClient } from "@/lib/supabase";

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export async function signUpWithEmail(input: {
  client: EarthIqSupabaseClient;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { data, error } = await input.client.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(`signUpWithEmail failed: ${error.message}`);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function loginWithEmail(input: {
  client: EarthIqSupabaseClient;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { data, error } = await input.client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(`loginWithEmail failed: ${error.message}`);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function getCurrentSession(
  client: EarthIqSupabaseClient,
): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(`getCurrentSession failed: ${error.message}`);
  }

  return data.session;
}

export async function logout(client: EarthIqSupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(`logout failed: ${error.message}`);
  }
}
