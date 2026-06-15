import type { Json } from "@/lib/supabase";

export interface PersistenceErrorLike {
  message: string;
}

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function assertSingleResult<T>(
  response: { data: T | null; error: PersistenceErrorLike | null },
  operation: string,
): T {
  if (response.error) {
    throw new Error(`${operation} failed: ${response.error.message}`);
  }

  if (!response.data) {
    throw new Error(`${operation} returned no data.`);
  }

  return response.data;
}

export function assertListResult<T>(
  response: { data: T[] | null; error: PersistenceErrorLike | null },
  operation: string,
): T[] {
  if (response.error) {
    throw new Error(`${operation} failed: ${response.error.message}`);
  }

  return response.data ?? [];
}
