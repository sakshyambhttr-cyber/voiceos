/* ─────────────────────────────────────────────────────────────
   Council Orchestrator — sequential execution with progress tracking
   Architecture is designed to allow parallel execution later
   by replacing sequential awaits with Promise.all() groups.
───────────────────────────────────────────────────────────── */

import { PlannerAgent } from "./agents/planner";
import { ResearcherAgent } from "./agents/researcher";
import { CriticAgent } from "./agents/critic";
import { ExecutorAgent } from "./agents/executor";
import { SynthesizerAgent } from "./agents/synthesizer";
import type { AgentInput, AgentProgressEvent, CouncilOutputs, CouncilResult } from "./types";
import type { MemoryTurn } from "@/app/api/agent/route";
import type { Goal } from "@/lib/goals/types";
import type { ToolStore } from "@/lib/tools";

/* ─── Agent instances (stateless, safe to share) ────────────── */
const planner = new PlannerAgent();
const researcher = new ResearcherAgent();
const critic = new CriticAgent();
const executor = new ExecutorAgent();
const synthesizer = new SynthesizerAgent();

/* ─── Orchestrator ───────────────────────────────────────────── */
export async function runCouncil(params: {
  userRequest: string;
  memory: MemoryTurn[];
  goals: Goal[];
  store: ToolStore;
}): Promise<CouncilResult> {
  const { userRequest, memory, goals, store } = params;
  const startTime = Date.now();
  const progress: AgentProgressEvent[] = [];
  const outputs: CouncilOutputs = {};

  console.log(`[Council] Starting for: "${userRequest.slice(0, 60)}"`);

  // ── Helper: run one agent with timing and error isolation ──
  async function runAgent<T>(
    agent: { name: string; execute: (i: AgentInput) => Promise<T> },
    buildInput: () => AgentInput
  ): Promise<T | null> {
    const t0 = Date.now();
    progress.push({ agent: agent.name as never, status: "running" });

    try {
      const result = await agent.execute(buildInput());
      const durationMs = Date.now() - t0;
      console.log(`[Council] ${agent.name} done in ${durationMs}ms`);
      progress.push({
        agent: agent.name as never,
        status: "done",
        durationMs,
        summary: getSummary(agent.name, result),
      });
      return result;
    } catch (err) {
      const durationMs = Date.now() - t0;
      console.error(`[Council] ${agent.name} failed:`, err);
      progress.push({ agent: agent.name as never, status: "error", durationMs });
      return null;
    }
  }

  // Build base input (same for all agents, updated with priorOutputs each time)
  const base = { userRequest, memory, goals, store };

  // ── Phase 1: Planner ──
  const plannerOut = await runAgent(planner, () => ({ ...base, priorOutputs: outputs }));
  if (plannerOut) {
    outputs.planner = plannerOut;
  }

  // ── Phase 2: Researcher (gets planner context) ──
  const researcherOut = await runAgent(researcher, () => ({ ...base, priorOutputs: outputs }));
  if (researcherOut) {
    outputs.researcher = researcherOut;
  }

  // ── Phase 3: Critic (gets planner + researcher context) ──
  const criticOut = await runAgent(critic, () => ({ ...base, priorOutputs: outputs }));
  if (criticOut) {
    outputs.critic = criticOut;
  }

  // ── Phase 4: Executor (gets all prior context) ──
  const executorOut = await runAgent(executor, () => ({ ...base, priorOutputs: outputs }));
  if (executorOut) {
    outputs.executor = executorOut;
  }

  // ── Phase 5: Synthesizer (combines everything) ──
  const synthOut = await runAgent(synthesizer, () => ({ ...base, priorOutputs: outputs }));

  const totalDurationMs = Date.now() - startTime;
  console.log(`[Council] Complete in ${totalDurationMs}ms`);

  if (synthOut) {
    outputs.synthesizer = synthOut;
    return {
      success: true,
      voiceResponse: synthOut.voiceResponse,
      outputs,
      agentProgress: progress,
      totalDurationMs,
    };
  }

  // If synthesizer failed, build a minimal fallback response
  const fallbackVoice = outputs.planner
    ? `${outputs.planner.strategy} Start with: ${outputs.executor?.actions?.[0] ?? "the first step immediately"}.`
    : "The council could not complete the analysis. Please try again.";

  return {
    success: false,
    voiceResponse: fallbackVoice,
    outputs,
    agentProgress: progress,
    totalDurationMs,
    error: "Synthesizer failed",
  };
}

/* ─── Extract a short summary from each agent's output ──────── */
function getSummary(agentName: string, output: unknown): string {
  if (!output || typeof output !== "object") return "";
  const o = output as Record<string, unknown>;
  switch (agentName) {
    case "Planner":
      return typeof o.strategy === "string" ? o.strategy.slice(0, 80) : "";
    case "Researcher":
      return typeof o.keyInsight === "string" ? o.keyInsight.slice(0, 80) : "";
    case "Critic":
      return Array.isArray(o.risks) && o.risks.length > 0 ? String(o.risks[0]).slice(0, 80) : "";
    case "Executor":
      return typeof o.sequence === "string" ? o.sequence.slice(0, 80) : "";
    case "Synthesizer":
      return typeof o.nextStep === "string" ? o.nextStep.slice(0, 80) : "";
    default:
      return "";
  }
}
