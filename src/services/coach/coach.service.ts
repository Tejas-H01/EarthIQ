import type { GeminiClient } from "@/lib/ai";
import type {
  CoachContext,
  CoachContextBuilderInput,
  CoachResponse,
} from "@/types";
import { CoachContextBuilder } from "./coach-context-builder";
import { CoachPromptBuilder } from "./coach-prompt-builder";

export class CoachService {
  constructor(
    private readonly geminiClient: GeminiClient,
    private readonly contextBuilder = new CoachContextBuilder(),
    private readonly promptBuilder = new CoachPromptBuilder(),
  ) {}

  async ask(input: {
    question: string;
    contextInput: CoachContextBuilderInput;
    model?: string;
  }): Promise<CoachResponse> {
    const context = this.contextBuilder.build(input.contextInput);

    return this.askWithContext({
      question: input.question,
      context,
      model: input.model,
    });
  }

  async askWithContext(input: {
    question: string;
    context: CoachContext;
    model?: string;
  }): Promise<CoachResponse> {
    const prompt = this.promptBuilder.build({
      question: input.question,
      context: input.context,
    });
    const response = await this.geminiClient.generateText({
      systemInstruction: prompt.systemInstruction,
      prompt: prompt.prompt,
      model: input.model,
    });

    return {
      type: prompt.responseType,
      category: prompt.category,
      answer: response.text,
      model: response.model,
      grounding: {
        hotspot: input.context.emissions.hotspot,
        recommendationCount: input.context.recommendations.length,
        progressCount: input.context.progress.length,
      },
    };
  }
}
