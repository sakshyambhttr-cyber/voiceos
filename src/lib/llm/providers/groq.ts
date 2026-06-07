/* ─────────────────────────────────────────────────────────────
   Groq Provider — OpenAI-compatible API
   Model: llama-3.1-8b-instant (ultra-fast, free tier)
   Env:   GROQ_API_KEY
───────────────────────────────────────────────────────────── */

import OpenAI from "openai";
import type { LLMProvider, LLMRequest } from "../types";
import { config } from "@/config";

export class GroqProvider implements LLMProvider {
  readonly name = "Groq";

  isAvailable(): boolean {
    const key = config.apiKeys.groq;
    return !!key && key.length >= 10;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = config.apiKeys.groq;
    if (!apiKey || apiKey.length < 10) {
      throw new Error("GROQ_API_KEY is not set or too short");
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: request.systemPrompt },
    ];

    for (const turn of request.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({ role: "user", content: request.prompt });

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: request.maxTokens ?? 200,
      temperature: request.temperature ?? 0.4,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq returned an empty response");
    }
    return text;
  }
}
