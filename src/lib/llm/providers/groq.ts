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

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: request.systemPrompt },
    ];

    for (const turn of request.history ?? []) {
      messages.push({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content,
      });
    }

    messages.push({ role: "user", content: request.prompt });

    let completion;
    try {
      completion = await client.chat.completions.create({
        model: config.constants.groqModel,
        messages,
        max_tokens: request.maxTokens ?? 200,
        temperature: request.temperature ?? 0.4,
        user: request.userId ?? "voice-agent-os-default-user",
      });
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : undefined;
      const name =
        error && typeof error === "object" && "name" in error
          ? (error as { name: string }).name
          : undefined;

      if (status === 429 || originalMessage.toLowerCase().includes("rate limit")) {
        throw new Error(`Groq rate limit exceeded (429): ${originalMessage}`);
      }
      if (status !== undefined && status >= 500) {
        throw new Error(`Groq server error (${status}): ${originalMessage}`);
      }
      if (
        name === "APIConnectionError" ||
        originalMessage.toLowerCase().includes("timeout") ||
        originalMessage.toLowerCase().includes("connection")
      ) {
        throw new Error(`Groq connection timeout or network issue: ${originalMessage}`);
      }
      throw new Error(`Groq API failed: ${originalMessage}`);
    }

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq returned an empty response");
    }
    return text;
  }
}
