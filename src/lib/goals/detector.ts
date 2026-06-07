/* ─────────────────────────────────────────────────────────────
   Goal Intent Detector — runs before LLM, zero latency
───────────────────────────────────────────────────────────── */

export type GoalIntent = "createGoal" | "listGoals" | "goalStatus" | "none";

/**
 * Detects whether the user's message is a goal-related intent.
 * Returns "none" if it should fall through to normal AI handling.
 */
export function detectGoalIntent(message: string): GoalIntent {
  const m = message.toLowerCase().trim();

  // List / status queries
  if (
    /my goals/.test(m) ||
    /(show|list|what are|tell me|do i have).{0,20}goal/.test(m) ||
    /goal progress/.test(m) ||
    /how.{0,15}(my|the).{0,10}goal/.test(m)
  ) {
    return "listGoals";
  }

  if (
    /goal status/.test(m) ||
    /status of.{0,20}goal/.test(m) ||
    /how am i doing.{0,20}(goal|plan)/.test(m)
  ) {
    return "goalStatus";
  }

  // Creation triggers
  if (
    /i want to (learn|build|launch|start|create|complete|finish|master|study|prepare|achieve|develop)/.test(
      m
    ) ||
    /help me (learn|prepare|plan|build|launch|achieve|study|complete|master)/.test(m) ||
    /i (need to|plan to|am going to|will) (learn|build|launch|complete|master|study)/.test(m) ||
    /set (a |my )?goal/.test(m) ||
    /create (a |my )?goal/.test(m) ||
    /make (a |my )?plan/.test(m) ||
    /plan for/.test(m) ||
    /roadmap for/.test(m)
  ) {
    return "createGoal";
  }

  return "none";
}

/**
 * Extracts a timeline hint from the raw message.
 * Returns a human-readable string like "3 months" or "2 weeks".
 */
export function extractTimeline(message: string): string {
  const m = message.toLowerCase();

  const match = m.match(/in\s+(\d+)\s*(day|week|month|year)s?|(\d+)\s*(day|week|month|year)s?/);
  if (match) {
    const num = match[1] || match[3];
    const unit = match[2] || match[4];
    return `${num} ${unit}${parseInt(num) > 1 ? "s" : ""}`;
  }

  if (/this week/.test(m)) {
    return "1 week";
  }
  if (/this month/.test(m)) {
    return "1 month";
  }
  if (/this year/.test(m)) {
    return "1 year";
  }
  if (/asap|as soon as possible|quickly/.test(m)) {
    return "2 weeks";
  }

  return "4 weeks"; // sensible default
}
