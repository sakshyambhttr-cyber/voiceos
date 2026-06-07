/* ─────────────────────────────────────────────────────────────
   OpenRouter Provider — future-ready
   Routes to 200+ models via a single OpenAI-compatible endpoint.
   Env:   OPENROUTER_API_KEY
   Model: configurable via OPENROUTER_MODEL (default: mistralai/mistral-7b-instruct)
───────────────────────────────────────────────────────────── */

import OpenAI from "openai";
import type { LLMProvider, LLMRequest } from "../types";
import { config } from "@/config";

export class OpenRouterProvider implements LLMProvider {
  readonly name = "OpenRouter";

  isAvailable(): boolean {
    const key = config.apiKeys.openRouter;
    return !!key && key.length >= 10;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = config.apiKeys.openRouter;
    if (!apiKey || apiKey.length < 10) {
      throw new Error("OPENROUTER_API_KEY is not set or too short");
    }

    const model = config.constants.openRouterModel;

    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://voice-agent-os.local",
        "X-Title": "Voice Agent OS",
      },
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
        model,
        messages,
        max_tokens: request.maxTokens ?? 200,
        temperature: request.temperature ?? 0.4,
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
        throw new Error(`OpenRouter rate limit exceeded (429): ${originalMessage}`);
      }
      if (status !== undefined && status >= 500) {
        throw new Error(`OpenRouter server error (${status}): ${originalMessage}`);
      }
      if (
        name === "APIConnectionError" ||
        originalMessage.toLowerCase().includes("timeout") ||
        originalMessage.toLowerCase().includes("connection")
      ) {
        throw new Error(`OpenRouter connection timeout or network issue: ${originalMessage}`);
      }
      throw new Error(`OpenRouter API failed: ${originalMessage}`);
    }

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenRouter returned an empty response");
    }
    return text;
  }
}
