import { llmRouter } from "@/lib/llm";
import type { Agent, AgentInput, SynthesizerOutput, CouncilOutputs } from "../types";

const SYSTEM = `You are the Synthesizer Agent in a multi-agent council.
Your job is to combine all prior agent outputs into a final, concise, voice-ready response.
Respond with ONLY valid JSON — no text before or after.
Schema:
{
  "voiceResponse": "2 to 3 spoken sentences for Murf TTS — no markdown, no bullets, no symbols",
  "strategy": "one sentence strategy summary",
  "topRisk": "the single biggest risk in one sentence",
  "nextStep": "the immediate first action in one sentence",
  "fullSummary": "4 to 6 sentences covering strategy, risks, actions, and next step"
}
Voice response rules: plain spoken sentences, concise, natural, starts with the key insight.`;

function fallback(outputs: CouncilOutputs, request: string): SynthesizerOutput {
  const strategy = outputs.planner?.strategy ?? "Execute the plan in structured phases.";
  const topRisk = outputs.critic?.risks?.[0] ?? "Underestimating the time required.";
  const nextStep = outputs.executor?.actions?.[0] ?? "Start with a planning session today.";

  return {
    voiceResponse: `Here is your action plan for ${request.slice(0, 40)}. ${strategy} Your biggest risk is ${topRisk.toLowerCase()}. Start today: ${nextStep.toLowerCase()}`,
    strategy,
    topRisk,
    nextStep,
    fullSummary: `Strategy: ${strategy} Risk: ${topRisk} Next step: ${nextStep}`,
  };
}

export class SynthesizerAgent implements Agent<SynthesizerOutput> {
  readonly name = "Synthesizer" as const;

  async execute(input: AgentInput): Promise<SynthesizerOutput> {
    const parts: string[] = [`User request: "${input.userRequest}"`];

    if (input.priorOutputs.planner) {
      const p = input.priorOutputs.planner;
      parts.push(
        `PLANNER — Strategy: ${p.strategy}. Timeline: ${p.timelineEstimate}. Milestones: ${p.milestones.join("; ")}.`
      );
    }
    if (input.priorOutputs.researcher) {
      const r = input.priorOutputs.researcher;
      parts.push(`RESEARCHER — Key insight: ${r.keyInsight}. Findings: ${r.findings.join("; ")}.`);
    }
    if (input.priorOutputs.critic) {
      const c = input.priorOutputs.critic;
      parts.push(
        `CRITIC — Top risk: ${c.risks[0] ?? "none"}. Weakness: ${c.weaknesses[0] ?? "none"}.`
      );
    }
    if (input.priorOutputs.executor) {
      const e = input.priorOutputs.executor;
      parts.push(
        `EXECUTOR — Sequence: ${e.sequence}. First action: ${e.actions[0] ?? "start immediately"}. Effort: ${e.effortEstimate}.`
      );
    }

    const result = await llmRouter.generate({
      prompt:
        parts.join("\n\n") + "\n\nSynthesize into a final concise voice response and summary.",
      systemPrompt: SYSTEM,
      temperature: 0.4,
      maxTokens: 400,
    });

    if (!result.success) {
      return fallback(input.priorOutputs, input.userRequest);
    }

    try {
      const clean = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const parsed = JSON.parse(clean) as SynthesizerOutput;
      if (parsed.voiceResponse && parsed.strategy) {
        return parsed;
      }
    } catch {
      /* fall through */
    }

    return fallback(input.priorOutputs, input.userRequest);
  }
}
