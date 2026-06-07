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

    const model = process.env.OPENROUTER_MODEL?.trim() || config.constants.openRouterDefaultModel;

    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://voice-agent-os.local",
        "X-Title": "Voice Agent OS",
      },
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: request.systemPrompt },
    ];

    for (const turn of request.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({ role: "user", content: request.prompt });

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: request.maxTokens ?? 200,
      temperature: request.temperature ?? 0.4,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenRouter returned an empty response");
    }
    return text;
  }
}
