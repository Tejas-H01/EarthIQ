import type { CoachQuestionCategory, CoachResponseType } from "@/types";

const categoryKeywords = {
  recommendation: [
    "recommend",
    "recommendation",
    "action",
    "why this",
    "best option",
  ],
  progress: ["progress", "done", "completed", "track", "status"],
  footprint: ["footprint", "emission", "carbon", "hotspot", "largest source"],
  planning: ["plan", "week", "schedule", "next step", "roadmap"],
} satisfies Record<Exclude<CoachQuestionCategory, "general">, string[]>;

export function classifyCoachQuestion(question: string): CoachQuestionCategory {
  const normalizedQuestion = question.toLowerCase();

  if (normalizedQuestion.includes("focus")) {
    return "general";
  }

  if (normalizedQuestion.includes("why should")) {
    return "recommendation";
  }

  const match = Object.entries(categoryKeywords).find(([, keywords]) =>
    keywords.some((keyword) => normalizedQuestion.includes(keyword)),
  );

  return (match?.[0] as CoachQuestionCategory | undefined) ?? "general";
}

export function getCoachResponseType(
  category: CoachQuestionCategory,
): CoachResponseType {
  const responseTypes = {
    recommendation: "recommendation_explanation",
    progress: "progress_summary",
    footprint: "sustainability_advice",
    planning: "goal_planning",
    general: "weekly_focus",
  } satisfies Record<CoachQuestionCategory, CoachResponseType>;

  return responseTypes[category];
}
