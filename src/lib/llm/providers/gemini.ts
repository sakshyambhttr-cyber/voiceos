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
      model: "gemini-1.5-flash",
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

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(request.prompt);
    const text = result.response.text().trim();

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }
    return text;
  }
}
