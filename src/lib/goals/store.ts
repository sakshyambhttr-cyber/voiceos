/* ─────────────────────────────────────────────────────────────
   Goal Store — in-memory, session-scoped (no DB)
   The store lives on the server process — survives hot reloads
   in dev but resets on restart. Sufficient for hackathon MVP.
───────────────────────────────────────────────────────────── */

import type { Goal } from "./types";

// Module-level singleton — shared across requests in same process
// Module-level singleton — shared across requests in same process
const seedGoals: Goal[] = [
  {
    id: "goal-ml-roadmap",
    title: "Master Machine Learning Roadmap",
    summary: "Master Machine Learning from math basics to deep learning architectures.",
    timeline: "3 months",
    strategy:
      "Start with Python and math, then build fundamental algorithms from scratch before diving into deep learning frameworks.",
    status: "active",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    milestones: [
      {
        id: "ml-m1",
        title: "Milestone One: Python and NumPy Basics",
        weekNumber: 1,
        description: "Focus on numpy exercises and vectorization concepts.",
        status: "in-progress",
        tasks: [
          {
            id: "ml-t1",
            milestoneId: "ml-m1",
            title: "Completing the NumPy exercises",
            done: false,
          },
          {
            id: "ml-t2",
            milestoneId: "ml-m1",
            title: "Pandas data wrangling tutorial",
            done: false,
          },
        ],
      },
      {
        id: "ml-m2",
        title: "Milestone Two: Mathematics for Machine Learning",
        weekNumber: 2,
        description: "Review linear algebra and matrix operations.",
        status: "pending",
        tasks: [
          {
            id: "ml-t3",
            milestoneId: "ml-m2",
            title: "Review linear algebra and matrix multiplication",
            done: false,
          },
        ],
      },
      {
        id: "ml-m3",
        title: "Milestone Three: Introduction to Deep Learning",
        weekNumber: 3,
        description: "Learn feedforward networks and backpropagation.",
        status: "pending",
        tasks: [
          {
            id: "ml-t4",
            milestoneId: "ml-m3",
            title: "Build neural network from scratch in Python",
            done: false,
          },
        ],
      },
    ],
  },
  {
    id: "goal-startup-launch",
    title: "Startup Launch Plan",
    summary: "Launch a SaaS product MVP in 3 months.",
    timeline: "3 months",
    strategy:
      "Validate the idea with landing page signups, build a minimal version, and launch to early adopters.",
    status: "active",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago (1 week)
    milestones: [
      {
        id: "startup-m1",
        title: "Milestone One: Market research and landing page",
        weekNumber: 1,
        description: "Conduct user interviews and design landing page.",
        status: "pending",
        tasks: [
          {
            id: "startup-t1",
            milestoneId: "startup-m1",
            title: "Conduct user interviews and design landing page",
            done: false,
          },
        ],
      },
    ],
  },
  {
    id: "goal-elec-exam",
    title: "Electronics Exam Prep",
    summary: "Prepare for the upcoming electronics final exam.",
    timeline: "1 week",
    strategy: "Review textbook chapters 5 through 8, solve practice problems, and clarify doubts.",
    status: "active",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    milestones: [
      {
        id: "elec-m1",
        title: "Milestone One: Read chapters 5 to 8",
        weekNumber: 1,
        description: "Study operational amplifier designs.",
        status: "in-progress",
        tasks: [
          {
            id: "elec-t1",
            milestoneId: "elec-m1",
            title: "Study operational amplifier designs",
            done: false,
          },
        ],
      },
    ],
  },
];

const goals: Goal[] = [...seedGoals];

export const goalStore = {
  add(goal: Goal): void {
    goals.push(goal);
    // Cap at 20 goals to avoid unbounded growth
    if (goals.length > 20) {
      goals.shift();
    }
  },

  getAll(): Goal[] {
    return [...goals];
  },

  getById(id: string): Goal | undefined {
    return goals.find((g) => g.id === id);
  },

  getActive(): Goal[] {
    return goals.filter((g) => g.status === "active");
  },

  update(id: string, patch: Partial<Goal>): boolean {
    const idx = goals.findIndex((g) => g.id === id);
    if (idx === -1) {
      return false;
    }
    goals[idx] = { ...goals[idx], ...patch };
    return true;
  },

  clear(): void {
    goals.length = 0;
  },

  count(): number {
    return goals.length;
  },
};
