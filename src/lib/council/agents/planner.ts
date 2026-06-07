import { llmRouter } from "@/lib/llm";
import type { Agent, AgentInput, PlannerOutput } from "../types";

const SYSTEM = `You are the Planner Agent in a multi-agent council.
Your job is to break down the user's request into a clear strategic roadmap.
Respond with ONLY valid JSON — no text before or after.
Schema:
{
  "strategy": "one sentence describing the overall approach",
  "milestones": ["milestone 1", "milestone 2", "milestone 3"],
  "timelineEstimate": "e.g. 4 weeks or 3 months"
}
Rules: plain text only, no markdown, 3 to 5 milestones, be specific and actionable.`;

function fallback(request: string): PlannerOutput {
  return {
    strategy: `Break "${request.slice(0, 50)}" into sequential phases with clear checkpoints.`,
    milestones: [
      "Define scope and gather resources",
      "Complete core work and build main deliverable",
      "Review, refine and prepare for delivery",
    ],
    timelineEstimate: "4 weeks",
  };
}

export class PlannerAgent implements Agent<PlannerOutput> {
  readonly name = "Planner" as const;

  async execute(input: AgentInput): Promise<PlannerOutput> {
    const result = await llmRouter.generate({
      prompt: `User request: "${input.userRequest}"\nCreate a strategic plan.`,
      systemPrompt: SYSTEM,
      temperature: 0.3,
      maxTokens: 300,
    });

    if (!result.success) {
      return fallback(input.userRequest);
    }

    try {
      const clean = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const parsed = JSON.parse(clean) as PlannerOutput;
      if (parsed.strategy && Array.isArray(parsed.milestones)) {
        return parsed;
      }
    } catch {
      /* fall through */
    }

    return fallback(input.userRequest);
  }
}
