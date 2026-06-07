/* ─────────────────────────────────────────────────────────────
   Goal Planner — converts user goal text into structured plans
   Uses the LLM Router (Gemini → Groq → OpenRouter)
   Falls back to a local template plan if all LLMs are unavailable.
───────────────────────────────────────────────────────────── */

import { llmRouter } from "@/lib/llm";
import { extractTimeline } from "./detector";
import type { Goal, Milestone, GoalTask, GoalPlanRequest, GoalPlanResult } from "./types";

/* ─── ID generator ───────────────────────────────────────────── */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/* ─── System prompt for the planner ─────────────────────────── */
const PLANNER_SYSTEM = `You are a Goal Planning Engine for a Voice Operating System.
Your job is to break a user's goal into a structured execution plan.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "one sentence summary of the goal",
  "strategy": "2 to 3 spoken sentences describing the execution approach",
  "milestones": [
    {
      "title": "milestone title",
      "weekNumber": 1,
      "description": "one sentence spoken description",
      "tasks": ["task 1", "task 2", "task 3"]
    }
  ]
}

Rules:
- Create 3 to 5 milestones spread across the timeline
- Each milestone has 2 to 4 concrete tasks
- All text must be plain spoken sentences — no markdown, no bullets, no symbols
- Milestones must be sequential and build on each other
- Tasks must be specific and actionable
- Respond with JSON only — no explanation before or after`;

/* ─── Fallback plan when LLM is unavailable ──────────────────── */
function buildFallbackPlan(rawGoal: string, timeline: string): Goal {
  const now = new Date().toISOString();
  const mid1 = uid();
  const mid2 = uid();
  const mid3 = uid();

  return {
    id: uid(),
    title: rawGoal,
    summary: `Working towards: ${rawGoal.slice(0, 60)}.`,
    timeline,
    strategy:
      "Start by breaking the goal into weekly milestones. Focus on one milestone at a time. Review and adjust your plan each week based on progress.",
    status: "active",
    createdAt: now,
    milestones: [
      {
        id: mid1,
        title: "Foundation — Week 1",
        weekNumber: 1,
        description:
          "Set up your environment and gather all the resources you need to get started.",
        status: "pending",
        tasks: [
          {
            id: uid(),
            milestoneId: mid1,
            title: "Research the topic and find key resources",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid1,
            title: "Set a daily study or work schedule",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid1,
            title: "Complete your first concrete action step",
            done: false,
          },
        ],
      },
      {
        id: mid2,
        title: "Core Progress — Midpoint",
        weekNumber: 2,
        description: "Build momentum by completing the core tasks required for your goal.",
        status: "pending",
        tasks: [
          {
            id: uid(),
            milestoneId: mid2,
            title: "Complete the main learning or building activities",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid2,
            title: "Apply what you have learned in a practical exercise",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid2,
            title: "Review progress and update your plan if needed",
            done: false,
          },
        ],
      },
      {
        id: mid3,
        title: "Completion — Final Phase",
        weekNumber: 3,
        description: "Finish the remaining tasks and consolidate everything you have accomplished.",
        status: "pending",
        tasks: [
          {
            id: uid(),
            milestoneId: mid3,
            title: "Complete all remaining core activities",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid3,
            title: "Review and reflect on what you have achieved",
            done: false,
          },
          {
            id: uid(),
            milestoneId: mid3,
            title: "Define next steps after completing this goal",
            done: false,
          },
        ],
      },
    ],
  };
}

/* ─── Parse LLM JSON response safely ────────────────────────── */
function parsePlanJSON(text: string): {
  summary: string;
  strategy: string;
  milestones: Array<{
    title: string;
    weekNumber: number;
    description: string;
    tasks: string[];
  }>;
} | null {
  try {
    // Strip markdown code fences if present
    const clean = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const parsed = JSON.parse(clean);
    if (
      typeof parsed.summary === "string" &&
      typeof parsed.strategy === "string" &&
      Array.isArray(parsed.milestones) &&
      parsed.milestones.length > 0
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Main planner function ──────────────────────────────────── */
export async function createGoalPlan(request: GoalPlanRequest): Promise<GoalPlanResult> {
  const { rawGoal, context } = request;
  const timeline = extractTimeline(rawGoal);

  const userPrompt = `Create a detailed execution plan for this goal:
"${rawGoal}"

Timeline: ${timeline}
${context ? `Context: ${context}` : ""}

Return only the JSON plan object.`;

  console.log(`[Goals] Planning goal: "${rawGoal.slice(0, 60)}" | Timeline: ${timeline}`);

  // Try LLM for a smart plan
  const llmResult = await llmRouter.generate({
    prompt: userPrompt,
    systemPrompt: PLANNER_SYSTEM,
    temperature: 0.3,
    maxTokens: 800,
  });

  let goal: Goal;

  if (llmResult.success) {
    const parsed = parsePlanJSON(llmResult.text);

    if (parsed) {
      console.log(`[Goals] Plan generated via ${llmResult.provider} in ${llmResult.latencyMs}ms`);

      const milestones: Milestone[] = parsed.milestones.map((m) => {
        const milestoneId = uid();
        const tasks: GoalTask[] = m.tasks.map((taskTitle) => ({
          id: uid(),
          milestoneId,
          title: taskTitle,
          done: false,
        }));
        return {
          id: milestoneId,
          title: m.title,
          weekNumber: m.weekNumber,
          description: m.description,
          status: "pending",
          tasks,
        };
      });

      goal = {
        id: uid(),
        title: rawGoal,
        summary: parsed.summary,
        timeline,
        strategy: parsed.strategy,
        milestones,
        status: "active",
        createdAt: new Date().toISOString(),
      };
    } else {
      console.warn("[Goals] LLM returned invalid JSON, using fallback plan");
      goal = buildFallbackPlan(rawGoal, timeline);
    }
  } else {
    console.warn("[Goals] LLM unavailable, using fallback plan");
    goal = buildFallbackPlan(rawGoal, timeline);
  }

  const milestoneCount = goal.milestones.length;
  const taskCount = goal.milestones.reduce((sum, m) => sum + m.tasks.length, 0);

  const voiceResponse =
    `Goal created. ${goal.summary} ` +
    `Your plan has ${milestoneCount} milestones and ${taskCount} tasks over ${timeline}. ` +
    `${goal.strategy.split(".")[0]}.`;

  return { success: true, goal, voiceResponse };
}

/* ─── Summarise goals for voice output ──────────────────────── */
export function summariseGoals(goals: Goal[]): string {
  if (goals.length === 0) {
    return "You have no active goals. Say a goal like: I want to learn Python in 3 months.";
  }

  const active = goals.filter((g) => g.status === "active");
  if (active.length === 0) {
    return "All your goals are completed. Say a new goal to start planning.";
  }

  if (active.length === 1) {
    const g = active[0];
    const done = g.milestones.filter((m) => m.status === "done").length;
    return `You have one active goal: ${g.summary} You are on milestone ${done + 1} of ${g.milestones.length}.`;
  }

  const titles = active
    .slice(0, 3)
    .map((g) => g.summary)
    .join(" Next: ");
  return `You have ${active.length} active goals. First: ${titles}.`;
}
