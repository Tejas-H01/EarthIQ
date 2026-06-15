import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { MissingConfigurationError } from "@/lib/errors";

export interface GeminiTextRequest {
  systemInstruction?: string;
  prompt: string;
  model?: string;
}

export interface GeminiTextResponse {
  text: string;
  model: string;
}

export interface GeminiClient {
  generateText(request: GeminiTextRequest): Promise<GeminiTextResponse>;
}

export function createGeminiClient(): GeminiClient {
  if (!env.GEMINI_API_KEY) {
    throw new MissingConfigurationError("GEMINI_API_KEY");
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  return {
    async generateText(request) {
      const model = request.model ?? env.GEMINI_MODEL;
      const response = await client.models.generateContent({
        model,
        contents: request.prompt,
        config: request.systemInstruction
          ? { systemInstruction: request.systemInstruction }
          : undefined,
      });

      return {
        text: response.text ?? "",
        model,
      };
    },
  };
}
