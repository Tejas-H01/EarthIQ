import type {
  CoachContext,
  CoachPrompt,
  CoachQuestionCategory,
  CoachResponseType,
} from "@/types";
import {
  classifyCoachQuestion,
  getCoachResponseType,
} from "./question-classifier";

function compactReasoning(context: CoachContext): string[] {
  const recommendationReasoning = context.recommendations.flatMap(
    (recommendation) => recommendation.reasoning.slice(0, 3),
  );

  return [...context.decisionInsights, ...recommendationReasoning].slice(0, 10);
}

function buildSystemInstruction(responseType: CoachResponseType): string {
  return [
    "You are the EarthIQ AI Sustainability Coach.",
    "Use only the EarthIQ reasoning and conclusions provided in the prompt.",
    "Do not calculate emissions, determine hotspots, rank recommendations, or create a plan independently.",
    "If information is missing, explain the limitation and suggest using EarthIQ assessment data.",
    `Return a concise ${responseType.replaceAll("_", " ")} response in natural language.`,
  ].join(" ");
}

export class CoachPromptBuilder {
  build(input: {
    question: string;
    context: CoachContext;
    category?: CoachQuestionCategory;
  }): CoachPrompt {
    const category = input.category ?? classifyCoachQuestion(input.question);
    const responseType = getCoachResponseType(category);

    const payload = {
      question: input.question,
      responseType,
      userGoals: {
        primaryGoal: input.context.contextProfile.primaryGoal,
        effortPreference: input.context.contextProfile.effortPreference,
        budgetLevel: input.context.contextProfile.budgetLevel,
        maxRecommendationCost: input.context.contextProfile.maxRecommendationCost,
      },
      emissions: input.context.emissions,
      topRecommendations: input.context.recommendations.slice(0, 5).map((item) => ({
        action: item.action,
        category: item.category,
        annualReductionKg: item.impact,
        suitability: item.suitability,
      })),
      reasoning: compactReasoning(input.context),
      plan: input.context.plan,
      progress: input.context.progress.map((item) => ({
        actionId: item.actionId,
        status: item.status,
        notes: item.notes ?? null,
        completedAt: item.completedAt ?? null,
      })),
    };

    return {
      systemInstruction: buildSystemInstruction(responseType),
      prompt: JSON.stringify(payload, null, 2),
      category,
      responseType,
    };
  }
}
