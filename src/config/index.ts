/**
 * Voice OS Configuration Manager
 * Centralizes environment variables, system constants, and feature flags.
 */

export const config = {
  // API Keys (always read via env, with fallback validation)
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY?.trim() || "",
    groq: process.env.GROQ_API_KEY?.trim() || "",
    openRouter: process.env.OPENROUTER_API_KEY?.trim() || "",
    murf: process.env.MURF_API_KEY?.trim() || "",
  },

  // System Constants
  constants: {
    murfStreamUrl: "https://global.api.murf.ai/v1/speech/stream",
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash",
    groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
    openRouterModel: process.env.OPENROUTER_MODEL?.trim() || "mistralai/mistral-7b-instruct",
    voiceRules: `
Output rules — your response will be spoken aloud by a TTS engine:
- Plain spoken sentences only. Zero markdown, no bullet symbols, no dashes, no asterisks.
- No emojis or special characters.
- Maximum 3 sentences. Be concise.
- Speak naturally as if in conversation.
- No filler openers like "Certainly!" or "Great question!"
- For sequences say: "First... then... finally..."
- If continuing a prior topic, acknowledge it naturally without restating everything.`,
    systemPrompts: {
      general: `You are Voice Agent OS — a calm, direct personal assistant for daily tasks.
Help with tasks, reminders, time management, and general knowledge.
You have memory of this session. Use it for contextual, non-repetitive answers.`,
      planner: `You are Voice Agent OS in Planner Mode — a structured scheduling assistant.
Structure responses as spoken time blocks: "In the morning... In the afternoon... In the evening..."
Prioritize high-impact work first. Remember what the user has planned this session.`,
      tutor: `You are Voice Agent OS in Tutor Mode — a patient, step-by-step teacher.
Break concepts into simple spoken steps. Ask one short follow-up question per response.
Build on what the user has already learned — do not repeat explained concepts.`,
      research: `You are Voice Agent OS in Research Mode — a precise knowledge analyst.
Structure each response as: key finding, supporting point, practical implication.
Connect insights across prior research topics from this session when relevant.`,
    },
  },

  // Feature Flags
  features: {
    enableMurfTts: !!(
      process.env.MURF_API_KEY?.trim() && process.env.MURF_API_KEY !== "your-murf-key-here"
    ),
    enableCouncil: true,
  },
};
