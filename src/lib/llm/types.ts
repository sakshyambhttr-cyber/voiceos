/* ─────────────────────────────────────────────────────────────
   LLM Abstraction Layer — Types
   All providers and the router share these interfaces.
───────────────────────────────────────────────────────────── */

/** A single turn in the conversation history */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Input to any LLM provider */
export interface LLMRequest {
  /** The user's current message */
  prompt: string;
  /** Full system instruction (personality + memory context) */
  systemPrompt: string;
  /** Prior conversation turns to include */
  history?: ChatTurn[];
  /** 0.0 – 1.0 creativity. Default 0.4 */
  temperature?: number;
  /** Hard cap on response tokens. Default 200 */
  maxTokens?: number;
}

/** Successful LLM response */
export interface LLMSuccess {
  success: true;
  text: string;
  provider: string;
  latencyMs: number;
}

/** Failed LLM response */
export interface LLMFailure {
  success: false;
  message: string;
  provider: "none";
  latencyMs: number;
}

export type LLMResult = LLMSuccess | LLMFailure;

/** Every provider must implement this interface */
export interface LLMProvider {
  /** Human-readable name used in logs */
  readonly name: string;
  /** Returns true when the required env var is present and non-empty */
  isAvailable(): boolean;
  /** Generate a response. Throws on failure. */
  generate(request: LLMRequest): Promise<string>;
}
