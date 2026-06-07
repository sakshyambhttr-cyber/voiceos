import { llmRouter } from "@/lib/llm";
import type { Agent, AgentInput, CriticOutput } from "../types";

const SYSTEM = `You are the Critic Agent in a multi-agent council.
Your job is to challenge the plan, identify risks, weaknesses, and blind spots.
Be constructive but honest — do not sugarcoat.
Respond with ONLY valid JSON — no text before or after.
Schema:
{
  "risks": ["risk 1", "risk 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "missingConsiderations": ["missing point 1", "missing point 2"]
}
Rules: plain text only, no markdown, 2 to 3 items per category, be specific.`;

function fallback(): CriticOutput {
  return {
    risks: [
      "Underestimating the time required for each phase.",
      "Starting execution without validating the core assumption.",
    ],
    weaknesses: [
      "The plan lacks a clear success metric to know when each phase is complete.",
      "No contingency plan if the primary approach fails.",
    ],
    missingConsiderations: [
      "External dependencies that could block progress.",
      "The need to allocate time for review and iteration.",
    ],
  };
}

export class CriticAgent implements Agent<CriticOutput> {
  readonly name = "Critic" as const;

  async execute(input: AgentInput): Promise<CriticOutput> {
    const context: string[] = [`User request: "${input.userRequest}"`];
    if (input.priorOutputs.planner) {
      context.push(
        `Plan: ${input.priorOutputs.planner.strategy}. Milestones: ${input.priorOutputs.planner.milestones.join(", ")}.`
      );
    }
    if (input.priorOutputs.researcher) {
      context.push(`Key insight: ${input.priorOutputs.researcher.keyInsight}`);
    }

    const result = await llmRouter.generate({
      prompt: context.join("\n") + "\nIdentify risks, weaknesses, and missing considerations.",
      systemPrompt: SYSTEM,
      temperature: 0.5,
      maxTokens: 350,
    });

    if (!result.success) {
      return fallback();
    }

    try {
      const clean = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const parsed = JSON.parse(clean) as CriticOutput;
      if (Array.isArray(parsed.risks)) {
        return parsed;
      }
    } catch {
      /* fall through */
    }

    return fallback();
  }
}
