import { describe, expect, it, vi } from "vitest";
import type { GeminiClient } from "@/lib/ai";
import {
  CoachContextBuilder,
  CoachPromptBuilder,
  CoachService,
  classifyCoachQuestion,
} from "@/services";
import type {
  CoachContextBuilderInput,
  DecisionReport,
  FourWeekSustainabilityPlan,
  RankedRecommendation,
} from "@/types";

const recommendation: RankedRecommendation = {
  id: "rec-1",
  action: "Use public transport twice weekly",
  category: "transport",
  impact: 320,
  cost: 40,
  difficulty: 2,
  supportedBudgetLevels: ["low", "medium", "high"],
  supportedGoals: ["save_money", "reduce_emissions"],
  supportedEffortLevels: ["low", "medium", "high"],
  explanation: "Transit reduces commute emissions.",
  priorityScore: 82,
  impactScore: 120,
  goalAlignment: 1.25,
  budgetCompatibility: 1.2,
};

const plan: FourWeekSustainabilityPlan = {
  weeks: [
    { week: 1, actions: [recommendation] },
    { week: 2, actions: [] },
    { week: 3, actions: [] },
    { week: 4, actions: [] },
  ],
};

const decisionReport: DecisionReport = {
  totalEmissions: 1000,
  largestEmissionSource: "transport",
  hotspotPercentage: 58,
  bestAction: {
    action: "Use public transport twice weekly",
    impact: 320,
  },
  projectedReduction: 320,
  keyInsights: [
    "Your annual footprint is 1000 kg CO2e.",
    "transport is the largest emission source at 58%.",
  ],
  recommendationSummaries: [
    {
      id: "rec-1",
      action: "Use public transport twice weekly",
      category: "transport",
      impact: 320,
      priorityScore: 82,
      explanation: {
        title: "Use public transport twice weekly",
        summary: "transport is your largest source of emissions.",
        reasoning: [
          "transport contributes 58% of your emissions.",
          "This action could reduce approximately 320 kg CO2 annually.",
          "This recommendation aligns with your budget.",
        ],
        projectedImpact: {
          annualReductionKg: 320,
        },
        suitability: {
          budgetCompatible: true,
          goalAligned: true,
          effortCompatible: true,
        },
      },
    },
  ],
};

const contextInput: CoachContextBuilderInput = {
  userProfile: {
    budget: 100,
    primaryGoal: "save_money",
    effortPreference: "low",
  },
  latestAssessment: {
    carbonBreakdown: {
      categories: {
        transport: 580,
        energy: 180,
        diet: 140,
        shopping: 100,
      },
      total: 1000,
    },
    contextProfile: {
      budget: 100,
      budgetLevel: "medium",
      maxRecommendationCost: 100,
      primaryGoal: "save_money",
      effortPreference: "low",
    },
    hotspot: {
      category: "transport",
      percentageContribution: 58,
    },
  },
  recommendations: [recommendation],
  plan,
  progress: [
    {
      actionId: "rec-1",
      status: "in_progress",
      notes: "Tried transit once.",
    },
  ],
  decisionReport,
};

describe("EarthIQ AI Sustainability Coach", () => {
  it("classifies coach questions", () => {
    expect(classifyCoachQuestion("Why is this recommendation best?")).toBe(
      "recommendation",
    );
    expect(classifyCoachQuestion("How is my progress this week?")).toBe(
      "progress",
    );
    expect(classifyCoachQuestion("What is my carbon footprint hotspot?")).toBe(
      "footprint",
    );
    expect(classifyCoachQuestion("What should my plan be next week?")).toBe(
      "planning",
    );
    expect(classifyCoachQuestion("How can I live more sustainably?")).toBe(
      "general",
    );
  });

  it("builds structured coach context from EarthIQ outputs", () => {
    const context = new CoachContextBuilder().build(contextInput);

    expect(context.emissions).toEqual({
      total: 1000,
      hotspot: "transport",
      hotspotPercentage: 58,
    });
    expect(context.recommendations).toHaveLength(1);
    expect(context.recommendations[0]?.reasoning).toContain(
      "transport contributes 58% of your emissions.",
    );
    expect(context.plan).toEqual([
      {
        week: 1,
        actions: ["Use public transport twice weekly"],
      },
      { week: 2, actions: [] },
      { week: 3, actions: [] },
      { week: 4, actions: [] },
    ]);
    expect(context.progress[0]?.status).toBe("in_progress");
  });

  it("generates guarded Gemini prompts from EarthIQ reasoning", () => {
    const context = new CoachContextBuilder().build(contextInput);
    const prompt = new CoachPromptBuilder().build({
      question: "Why should I use public transport?",
      context,
    });
    const parsedPrompt = JSON.parse(prompt.prompt) as {
      reasoning: string[];
      topRecommendations: Array<{ action: string }>;
    };

    expect(prompt.category).toBe("recommendation");
    expect(prompt.responseType).toBe("recommendation_explanation");
    expect(prompt.systemInstruction).toContain(
      "Do not calculate emissions, determine hotspots, rank recommendations, or create a plan independently.",
    );
    expect(parsedPrompt.reasoning).toContain(
      "transport contributes 58% of your emissions.",
    );
    expect(parsedPrompt.topRecommendations[0]?.action).toBe(
      "Use public transport twice weekly",
    );
    expect(prompt.prompt).not.toContain("carbon_breakdown");
    expect(prompt.prompt).not.toContain("recommendation_set_id");
  });

  it("uses Gemini only for natural language generation", async () => {
    const geminiClient: GeminiClient = {
      generateText: vi.fn(async () => ({
        text: "Focus on one transit commute this week and track how it feels.",
        model: "gemini-test",
      })),
    };
    const service = new CoachService(geminiClient);

    const response = await service.ask({
      question: "What should I focus on this week?",
      contextInput,
    });

    expect(response).toEqual({
      type: "weekly_focus",
      category: "general",
      answer: "Focus on one transit commute this week and track how it feels.",
      model: "gemini-test",
      grounding: {
        hotspot: "transport",
        recommendationCount: 1,
        progressCount: 1,
      },
    });
    expect(geminiClient.generateText).toHaveBeenCalledTimes(1);
    expect(geminiClient.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "Use only the EarthIQ reasoning and conclusions provided",
        ),
      }),
    );
  });

  it("handles missing assessment, recommendations, plan, and progress", () => {
    const context = new CoachContextBuilder().build({
      userProfile: {
        budget: 25,
        primaryGoal: "low_effort",
        effortPreference: "low",
      },
      latestAssessment: null,
      recommendations: [],
      plan: null,
      progress: [],
      decisionReport: null,
    });
    const prompt = new CoachPromptBuilder().build({
      question: "Can you help me?",
      context,
    });
    const parsedPrompt = JSON.parse(prompt.prompt) as {
      emissions: { total: number; hotspot: string | null };
      topRecommendations: unknown[];
      progress: unknown[];
    };

    expect(context.emissions).toEqual({
      total: 0,
      hotspot: null,
      hotspotPercentage: 0,
    });
    expect(parsedPrompt.emissions).toEqual({
      total: 0,
      hotspot: null,
      hotspotPercentage: 0,
    });
    expect(parsedPrompt.topRecommendations).toEqual([]);
    expect(parsedPrompt.progress).toEqual([]);
    expect(prompt.systemInstruction).toContain(
      "If information is missing, explain the limitation",
    );
  });
});
