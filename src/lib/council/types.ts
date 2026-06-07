/* ─────────────────────────────────────────────────────────────
   Multi-Agent Council — Types
───────────────────────────────────────────────────────────── */

import type { MemoryTurn } from "@/app/api/agent/route";
import type { Goal } from "@/lib/goals/types";
import type { ToolStore } from "@/lib/tools";

/* ─── Agent names ────────────────────────────────────────────── */
export type AgentName = "Planner" | "Researcher" | "Critic" | "Executor" | "Synthesizer";

export type AgentStatus = "pending" | "running" | "done" | "error";

/* ─── Shared input given to every agent ─────────────────────── */
export interface AgentInput {
  /** The original user request */
  userRequest: string;
  /** Session memory for context */
  memory: MemoryTurn[];
  /** Active goals for context */
  goals: Goal[];
  /** Task/notes store for context */
  store: ToolStore;
  /** Accumulated outputs from prior agents in the chain */
  priorOutputs: Partial<CouncilOutputs>;
}

/* ─── Per-agent output types ─────────────────────────────────── */
export interface PlannerOutput {
  strategy: string;
  milestones: string[];
  timelineEstimate: string;
}

export interface ResearcherOutput {
  findings: string[];
  keyInsight: string;
}

export interface CriticOutput {
  risks: string[];
  weaknesses: string[];
  missingConsiderations: string[];
}

export interface ExecutorOutput {
  actions: string[];
  sequence: string;
  effortEstimate: string;
}

export interface SynthesizerOutput {
  voiceResponse: string; // spoken final answer — concise, Murf-ready
  strategy: string;
  topRisk: string;
  nextStep: string;
  fullSummary: string; // for UI display
}

export interface CouncilOutputs {
  planner?: PlannerOutput;
  researcher?: ResearcherOutput;
  critic?: CriticOutput;
  executor?: ExecutorOutput;
  synthesizer?: SynthesizerOutput;
}

/* ─── Agent progress event (for UI streaming) ───────────────── */
export interface AgentProgressEvent {
  agent: AgentName;
  status: AgentStatus;
  summary?: string; // one sentence of what the agent produced
  durationMs?: number;
}

/* ─── Council result ─────────────────────────────────────────── */
export interface CouncilResult {
  success: boolean;
  voiceResponse: string;
  outputs: CouncilOutputs;
  agentProgress: AgentProgressEvent[];
  totalDurationMs: number;
  error?: string;
}

/* ─── Agent interface every agent must implement ─────────────── */
export interface Agent<TOutput> {
  readonly name: AgentName;
  execute(input: AgentInput): Promise<TOutput>;
}
