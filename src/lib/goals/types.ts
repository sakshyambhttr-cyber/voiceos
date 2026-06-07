/* ─────────────────────────────────────────────────────────────
   Goal Planning Engine — Data Structures
───────────────────────────────────────────────────────────── */

export type GoalStatus = "active" | "completed" | "paused";
export type MilestoneStatus = "pending" | "in-progress" | "done";

export interface GoalTask {
  id: string;
  title: string;
  milestoneId: string;
  done: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  weekNumber: number; // which week of the plan
  description: string; // one spoken sentence
  status: MilestoneStatus;
  tasks: GoalTask[];
}

export interface Goal {
  id: string;
  title: string; // original user input
  summary: string; // one spoken sentence summary
  timeline: string; // e.g. "3 months", "2 weeks"
  strategy: string; // spoken execution strategy (2–3 sentences)
  milestones: Milestone[];
  status: GoalStatus;
  createdAt: string; // ISO timestamp
}

export interface GoalPlanRequest {
  rawGoal: string; // what the user said
  context?: string; // optional memory/mode context
}

export interface GoalPlanResult {
  success: boolean;
  goal?: Goal;
  voiceResponse: string; // spoken confirmation
  error?: string;
}
