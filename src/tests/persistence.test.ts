import { describe, expect, it } from "vitest";
import {
  loginWithEmail,
  logout,
  getCurrentSession,
  signUpWithEmail,
} from "@/lib/auth";
import type { EarthIqSupabaseClient } from "@/lib/supabase";
import {
  AssessmentRepository,
  PlanRepository,
  ProfileRepository,
  ProgressRepository,
  RecommendationRepository,
} from "@/repositories";
import { PersistenceService } from "@/services";
import type {
  CarbonCalculationResult,
  ContextProfile,
  FourWeekSustainabilityPlan,
  RankedRecommendation,
} from "@/types";

type Row = { [key: string]: unknown };
type TableStore = Record<string, Row[]>;
type Filter = { column: string; value: unknown };
type Response<T> = { data: T | null; error: { message: string } | null };

class MockQueryBuilder {
  private operation: "select" | "insert" | "upsert" | "update" = "select";
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private orderColumn: string | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;
  private conflictColumns: string[] = [];

  constructor(
    private readonly table: string,
    private readonly store: TableStore,
  ) {}

  insert(payload: Row | Row[]): this {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }): this {
    this.operation = "upsert";
    this.payload = payload;
    this.conflictColumns =
      options?.onConflict?.split(",").map((column) => column.trim()) ?? [];
    return this;
  }

  update(payload: Row): this {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  select(columns = "*"): this {
    void columns;

    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async single(): Promise<Response<Row>> {
    const rows = this.execute();
    return {
      data: rows[0] ?? null,
      error: rows[0] ? null : { message: "No rows found" },
    };
  }

  async maybeSingle(): Promise<Response<Row>> {
    const rows = this.execute();
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  then<TResult1 = Response<Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: Response<Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.execute(),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  private execute(): Row[] {
    if (!this.store[this.table]) {
      this.store[this.table] = [];
    }

    if (this.operation === "insert") {
      const inserted = this.normalizePayload().map((row) => this.withDefaults(row));
      this.store[this.table].push(...inserted);
      return inserted;
    }

    if (this.operation === "upsert") {
      return this.normalizePayload().map((row) => this.upsertRow(row));
    }

    if (this.operation === "update") {
      const updates = this.payload && !Array.isArray(this.payload) ? this.payload : {};
      const matched = this.filteredRows();
      matched.forEach((row) => {
        Object.assign(row, updates, { updated_at: new Date().toISOString() });
      });
      return matched;
    }

    return this.applyResultModifiers(this.filteredRows());
  }

  private normalizePayload(): Row[] {
    if (!this.payload) {
      return [];
    }

    return Array.isArray(this.payload) ? this.payload : [this.payload];
  }

  private upsertRow(row: Row): Row {
    const existing = this.store[this.table].find((candidate) =>
      this.conflictColumns.every((column) => candidate[column] === row[column]),
    );

    if (existing) {
      Object.assign(existing, row, { updated_at: new Date().toISOString() });
      return existing;
    }

    const inserted = this.withDefaults(row);
    this.store[this.table].push(inserted);
    return inserted;
  }

  private withDefaults(row: Row): Row {
    const now = new Date().toISOString();
    return {
      id: row.id ?? `${this.table}-${this.store[this.table].length + 1}`,
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? now,
      ...row,
    };
  }

  private filteredRows(): Row[] {
    return this.store[this.table].filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );
  }

  private applyResultModifiers(rows: Row[]): Row[] {
    const ordered = [...rows];

    if (this.orderColumn) {
      ordered.sort((left, right) => {
        const leftValue = String(left[this.orderColumn ?? ""]);
        const rightValue = String(right[this.orderColumn ?? ""]);
        return this.orderAscending
          ? leftValue.localeCompare(rightValue)
          : rightValue.localeCompare(leftValue);
      });
    }

    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }
}

class MockSupabaseClient {
  readonly store: TableStore = {};
  readonly auth = {
    signUp: async ({ email }: { email: string; password: string }) => ({
      data: {
        user: { id: "user-1", email },
        session: { access_token: "signup-token", user: { id: "user-1", email } },
      },
      error: null,
    }),
    signInWithPassword: async ({
      email,
    }: {
      email: string;
      password: string;
    }) => ({
      data: {
        user: { id: "user-1", email },
        session: { access_token: "login-token", user: { id: "user-1", email } },
      },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: {
          access_token: "current-token",
          user: { id: "user-1", email: "test@example.com" },
        },
      },
      error: null,
    }),
    signOut: async () => ({ error: null }),
  };

  from(table: string): MockQueryBuilder {
    return new MockQueryBuilder(table, this.store);
  }
}

const carbonBreakdown: CarbonCalculationResult = {
  categories: {
    transport: 100,
    energy: 200,
    diet: 300,
    shopping: 50,
  },
  total: 650,
};

const contextProfile: ContextProfile = {
  budget: 100,
  budgetLevel: "medium",
  maxRecommendationCost: 100,
  primaryGoal: "save_money",
  effortPreference: "low",
};

const rankedRecommendation: RankedRecommendation = {
  id: "rec-1",
  action: "Adjust setpoints",
  category: "energy",
  impact: 200,
  cost: 0,
  difficulty: 1,
  supportedBudgetLevels: ["low", "medium", "high"],
  supportedGoals: ["save_money"],
  supportedEffortLevels: ["low", "medium", "high"],
  explanation: "Saves energy.",
  priorityScore: 80,
  impactScore: 120,
  goalAlignment: 1.25,
  budgetCompatibility: 1.2,
};

const plan: FourWeekSustainabilityPlan = {
  weeks: [
    {
      week: 1,
      actions: [rankedRecommendation],
    },
    { week: 2, actions: [] },
    { week: 3, actions: [] },
    { week: 4, actions: [] },
  ],
};

function createMockClient(): EarthIqSupabaseClient {
  return new MockSupabaseClient() as unknown as EarthIqSupabaseClient;
}

describe("EarthIQ Persistence Layer", () => {
  it("persists and loads repository records", async () => {
    const client = createMockClient();
    const profiles = new ProfileRepository(client);
    const assessments = new AssessmentRepository(client);
    const recommendations = new RecommendationRepository(client);
    const plans = new PlanRepository(client);
    const progress = new ProgressRepository(client);

    const profile = await profiles.upsertProfile({
      user_id: "user-1",
      email: "test@example.com",
    });
    const assessment = await assessments.saveAssessment({
      userId: "user-1",
      carbonBreakdown,
      contextProfile,
      hotspot: {
        category: "diet",
        percentageContribution: 46.15,
      },
    });
    const recommendationSet = await recommendations.saveRecommendations({
      userId: "user-1",
      assessmentId: assessment.id,
      recommendations: [rankedRecommendation],
    });
    const savedPlan = await plans.savePlan({
      userId: "user-1",
      recommendationSetId: recommendationSet.id,
      plan,
    });
    const savedProgress = await progress.updateProgress({
      userId: "user-1",
      planId: savedPlan.id,
      actionId: rankedRecommendation.id,
      status: "completed",
    });

    await expect(profiles.getProfile("user-1")).resolves.toEqual(profile);
    await expect(assessments.loadLatestAssessment("user-1")).resolves.toEqual(
      assessment,
    );
    await expect(
      recommendations.loadRecommendations({
        userId: "user-1",
        assessmentId: assessment.id,
      }),
    ).resolves.toEqual([recommendationSet]);
    await expect(plans.loadPlan({ userId: "user-1" })).resolves.toEqual(savedPlan);
    await expect(
      progress.loadProgress({ userId: "user-1", planId: savedPlan.id }),
    ).resolves.toEqual([savedProgress]);
  });

  it("orchestrates persistence service methods", async () => {
    const client = createMockClient();
    const service = new PersistenceService({
      assessments: new AssessmentRepository(client),
      recommendations: new RecommendationRepository(client),
      plans: new PlanRepository(client),
      progress: new ProgressRepository(client),
    });

    const assessment = await service.saveAssessment({
      userId: "user-1",
      carbonBreakdown,
      contextProfile,
      hotspot: null,
    });
    const recommendationSet = await service.saveRecommendations({
      userId: "user-1",
      assessmentId: assessment.id,
      recommendations: [rankedRecommendation],
    });
    const savedPlan = await service.savePlan({
      userId: "user-1",
      recommendationSetId: recommendationSet.id,
      plan,
    });
    const savedProgress = await service.updateProgress({
      userId: "user-1",
      planId: savedPlan.id,
      actionId: rankedRecommendation.id,
      status: "in_progress",
    });

    await expect(service.loadLatestAssessment("user-1")).resolves.toEqual(
      assessment,
    );
    await expect(
      service.loadRecommendations({ userId: "user-1" }),
    ).resolves.toEqual([recommendationSet]);
    await expect(service.loadPlan({ userId: "user-1" })).resolves.toEqual(savedPlan);
    await expect(service.loadProgress({ userId: "user-1" })).resolves.toEqual([
      savedProgress,
    ]);
  });

  it("wraps Supabase authentication helpers", async () => {
    const client = createMockClient();

    await expect(
      signUpWithEmail({
        client,
        email: "test@example.com",
        password: "password123",
      }),
    ).resolves.toMatchObject({
      user: { id: "user-1", email: "test@example.com" },
      session: { access_token: "signup-token" },
    });
    await expect(
      loginWithEmail({
        client,
        email: "test@example.com",
        password: "password123",
      }),
    ).resolves.toMatchObject({
      user: { id: "user-1", email: "test@example.com" },
      session: { access_token: "login-token" },
    });
    await expect(getCurrentSession(client)).resolves.toMatchObject({
      access_token: "current-token",
    });
    await expect(logout(client)).resolves.toBeUndefined();
  });
});
