/* ─────────────────────────────────────────────────────────────
   LLM Router — provider-agnostic request dispatcher
   
   Priority order: Gemini → Groq → OpenRouter → error
   
   Retry policy: each provider gets 1 retry on transient failure
   (network timeout, rate limit 429) before moving to next provider.
───────────────────────────────────────────────────────────── */

import type { LLMProvider, LLMRequest, LLMResult } from "./types";

/* ─── Error types that warrant a retry ───────────────────────── */
const RETRYABLE_MESSAGES = ["timeout", "rate limit", "429", "503", "overloaded", "unavailable"];

function isRetryable(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return RETRYABLE_MESSAGES.some((s) => msg.includes(s));
}

/* ─── Router class ───────────────────────────────────────────── */
export class LLMRouter {
  private providers: LLMProvider[];

  constructor(providers: LLMProvider[]) {
    this.providers = providers;
  }

  /**
   * Attempt to generate a response.
   * Tries each available provider in order.
   * Each provider gets one retry on transient errors.
   * Returns a structured LLMResult — never throws.
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    const available = this.providers.filter((p) => p.isAvailable());

    if (available.length === 0) {
      console.warn("[LLM] No providers available");
      return {
        success: false,
        message: "No AI provider available. Add a GEMINI_API_KEY or GROQ_API_KEY to .env.local.",
        provider: "none",
        latencyMs: 0,
      };
    }

    let lastError: unknown = null;

    for (const provider of available) {
      // Each provider gets 2 attempts (1 retry on transient error)
      for (let attempt = 1; attempt <= 2; attempt++) {
        const t0 = Date.now();
        try {
          const text = await provider.generate(request);
          const latencyMs = Date.now() - t0;

          console.log(
            `[LLM] Provider: ${provider.name} | Latency: ${(latencyMs / 1000).toFixed(2)}s` +
              (attempt > 1 ? " (retry succeeded)" : "")
          );

          return { success: true, text, provider: provider.name, latencyMs };
        } catch (err) {
          lastError = err;

          const errMsg = err instanceof Error ? err.message : String(err);
          const isLast = attempt === 2;

          if (isRetryable(err) && !isLast) {
            console.warn(
              `[LLM] Provider: ${provider.name} | Attempt ${attempt} failed (retryable): ${errMsg}`
            );
            // Brief pause before retry
            await new Promise((r) => setTimeout(r, 300));
          } else {
            console.warn(
              `[LLM] Provider: ${provider.name} | Failed after ${attempt} attempt(s): ${errMsg}` +
                (isLast ? " — trying next provider" : "")
            );
            break; // non-retryable or final attempt — move to next provider
          }
        }
      }

      // Log fallback activation when moving to the next provider
      const nextIdx = available.indexOf(provider) + 1;
      if (nextIdx < available.length) {
        console.log(`[LLM] Fallback Activated → switching to ${available[nextIdx].name}`);
      }
    }

    const errMsg = lastError instanceof Error ? lastError.message : "All providers failed";

    console.error(`[LLM] All providers exhausted. Last error: ${errMsg}`);
    return {
      success: false,
      message: "All AI providers failed. Please check your API keys and try again.",
      provider: "none",
      latencyMs: 0,
    };
  }

  /** Returns names of currently available providers */
  getAvailableProviders(): string[] {
    return this.providers.filter((p) => p.isAvailable()).map((p) => p.name);
  }
}
