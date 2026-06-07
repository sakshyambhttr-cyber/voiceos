import OpenAI from "openai";
import { GeminiProvider } from "./lib/llm/providers/gemini";
import { GroqProvider } from "./lib/llm/providers/groq";
import { OpenRouterProvider } from "./lib/llm/providers/openrouter";

async function main() {
  console.log("Checking providers...");
  const gemini = new GeminiProvider();
  const groq = new GroqProvider();
  const openrouter = new OpenRouterProvider();

  const msg: OpenAI.ChatCompletionMessageParam = { role: "user", content: "hello" };
  console.log("Msg:", msg);

  console.log("Gemini available:", gemini.isAvailable());
  console.log("Groq available:", groq.isAvailable());
  console.log("OpenRouter available:", openrouter.isAvailable());

  const req = {
    prompt: "Say 'Hello World' in 3 words.",
    systemPrompt: "You are a brief assistant.",
  };

  if (gemini.isAvailable()) {
    console.log("Testing Gemini generate...");
    try {
      const res = await gemini.generate(req);
      console.log("Gemini response:", res);
    } catch (e) {
      console.error("Gemini generate failed:", e);
    }
  }

  if (groq.isAvailable()) {
    console.log("Testing Groq generate...");
    try {
      const res = await groq.generate(req);
      console.log("Groq response:", res);
    } catch (e) {
      console.error("Groq generate failed:", e);
    }
  }
}

main().catch(console.error);
