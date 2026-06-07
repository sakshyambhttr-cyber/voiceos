/* ─────────────────────────────────────────────────────────────
   LLM Layer — public entry point
   
   Import from here everywhere in the app:
     import { llmRouter } from "@/lib/llm"
   
   To add a new provider:
     1. Create lib/llm/providers/yourprovider.ts
     2. Implement LLMProvider interface
     3. Add instance to the providers array below
     — nothing else changes
───────────────────────────────────────────────────────────── */

import { LLMRouter } from "./router";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";

// Provider priority: first in array = first tried
// isAvailable() is checked at request time — no startup cost
const llmRouter = new LLMRouter([
  new GeminiProvider(), // Primary
  new GroqProvider(), // Fallback 1
  new OpenRouterProvider(), // Fallback 2
]);

// Re-export types and router for consumers
export { llmRouter };
export type { LLMRequest, LLMResult, LLMProvider, ChatTurn } from "./types";
