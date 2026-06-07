/* ─────────────────────────────────────────────────────────────
   Gemini Provider — Google Generative AI
   Model: gemini-1.5-flash (fast, free tier)
   Env:   GEMINI_API_KEY
───────────────────────────────────────────────────────────── */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMRequest } from "../types";
import { config } from "@/config";

export class GeminiProvider implements LLMProvider {
  readonly name = "Gemini";

  isAvailable(): boolean {
    const key = config.apiKeys.gemini;
    return !!key && key.length >= 10;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = config.apiKeys.gemini;
    if (!apiKey || apiKey.length < 10) {
      throw new Error("GEMINI_API_KEY is not set or too short");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: config.constants.geminiModel,
      systemInstruction: request.systemPrompt,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 200,
        temperature: request.temperature ?? 0.4,
      },
    });

    // Convert history to Gemini's expected format
    const history: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (const turn of request.history ?? []) {
      history.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      });
    }

    let result;
    try {
      const chat = model.startChat({ history });
      result = await chat.sendMessage(request.prompt);
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : undefined;

      if (
        originalMessage.toLowerCase().includes("rate limit") ||
        originalMessage.toLowerCase().includes("quota") ||
        status === 429
      ) {
        throw new Error(`Gemini rate limit exceeded (429): ${originalMessage}`);
      }
      if (
        originalMessage.toLowerCase().includes("timeout") ||
        originalMessage.toLowerCase().includes("connection")
      ) {
        throw new Error(`Gemini connection timeout or network issue: ${originalMessage}`);
      }
      throw new Error(`Gemini API failed: ${originalMessage}`);
    }

    const text = result.response.text().trim();

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }
    return text;
  }
}
