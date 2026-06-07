import { llmRouter } from "@/lib/llm";
import type { Agent, AgentInput, ExecutorOutput } from "../types";

const SYSTEM = `You are the Executor Agent in a multi-agent council.
Your job is to turn the strategy into a concrete, sequenced action plan.
Respond with ONLY valid JSON — no text before or after.
Schema:
{
  "actions": ["action 1", "action 2", "action 3", "action 4"],
  "sequence": "one sentence describing the order of execution",
  "effortEstimate": "e.g. 2 hours per day for 4 weeks"
}
Rules: plain text only, no markdown, 4 to 6 specific actions, each action starts with a verb.`;

function fallback(): ExecutorOutput {
  return {
    actions: [
      "Start today with a 30-minute planning session to map out your first week.",
      "Complete the foundational setup in the first three days.",
      "Execute core work in daily focused sessions of two hours minimum.",
      "Conduct a mid-point review at the halfway mark and adjust the plan.",
      "Finalize and review all deliverables in the last phase.",
    ],
    sequence: "Start with setup, move to core execution, then finalize and review.",
    effortEstimate: "2 focused hours per day",
  };
}

export class ExecutorAgent implements Agent<ExecutorOutput> {
  readonly name = "Executor" as const;

  async execute(input: AgentInput): Promise<ExecutorOutput> {
    const context: string[] = [`User request: "${input.userRequest}"`];
    if (input.priorOutputs.planner) {
      context.push(`Strategy: ${input.priorOutputs.planner.strategy}`);
    }
    if (input.priorOutputs.critic?.risks.length) {
      context.push(`Key risks to address: ${input.priorOutputs.critic.risks[0]}`);
    }

    const result = await llmRouter.generate({
      prompt:
        context.join("\n") + "\nCreate a concrete action plan with sequencing and effort estimate.",
      systemPrompt: SYSTEM,
      temperature: 0.35,
      maxTokens: 400,
    });

    if (!result.success) {
      return fallback();
    }

    try {
      const clean = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const parsed = JSON.parse(clean) as ExecutorOutput;
      if (Array.isArray(parsed.actions) && parsed.sequence) {
        return parsed;
      }
    } catch {
      /* fall through */
    }

    return fallback();
  }
}
