import type { AiCoach as AiCoachContract } from "@/interfaces";
import type { AiCoachMessage } from "@/types";
import type { GeminiClient } from "@/lib/ai";
import { EngineNotImplementedError } from "@/lib/errors";

export class AiCoach implements AiCoachContract {
  constructor(private readonly geminiClient?: GeminiClient) {}

  async respond(_messages: AiCoachMessage[]): Promise<AiCoachMessage> {
    void _messages;

    if (!this.geminiClient) {
      throw new EngineNotImplementedError("AiCoach", "respond");
    }

    throw new EngineNotImplementedError("AiCoach", "respond");
  }
}
