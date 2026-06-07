import { llmRouter } from "@/lib/llm";
import type { Agent, AgentInput, ResearcherOutput } from "../types";

const SYSTEM = `You are the Researcher Agent in a multi-agent council.
Your job is to surface relevant knowledge, best practices, and insights for the user's request.
Respond with ONLY valid JSON — no text before or after.
Schema:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "keyInsight": "the single most important insight as one spoken sentence"
}
Rules: plain text only, no markdown, 3 to 5 findings, be specific and evidence-based.`;

function fallback(request: string): ResearcherOutput {
  return {
    findings: [
      "Focus on solving one problem exceptionally well rather than many problems partially.",
      "Successful outcomes in this area consistently involve early feedback and iteration.",
      "The biggest failure mode is over-engineering — prioritize the simplest working solution.",
    ],
    keyInsight: `For "${request.slice(0, 40)}", execution quality matters more than idea originality.`,
  };
}

export class ResearcherAgent implements Agent<ResearcherOutput> {
  readonly name = "Researcher" as const;

  async execute(input: AgentInput): Promise<ResearcherOutput> {
    const plannerContext = input.priorOutputs.planner
      ? `\nPlanner strategy: ${input.priorOutputs.planner.strategy}`
      : "";

    const result = await llmRouter.generate({
      prompt: `User request: "${input.userRequest}"${plannerContext}\nResearch relevant knowledge and best practices.`,
      systemPrompt: SYSTEM,
      temperature: 0.4,
      maxTokens: 350,
    });

    if (!result.success) {
      return fallback(input.userRequest);
    }

    try {
      const clean = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const parsed = JSON.parse(clean) as ResearcherOutput;
      if (Array.isArray(parsed.findings) && parsed.keyInsight) {
        return parsed;
      }
    } catch {
      /* fall through */
    }

    return fallback(input.userRequest);
  }
}
