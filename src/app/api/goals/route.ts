import { NextRequest, NextResponse } from "next/server";
import { createGoalPlan, summariseGoals, goalStore, Goal } from "@/lib/goals";

/* POST /api/goals — create a new goal plan */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawGoal, context } = body as { rawGoal: string; context?: string };

    if (!rawGoal || typeof rawGoal !== "string" || rawGoal.trim() === "") {
      return NextResponse.json({ error: "rawGoal is required" }, { status: 400 });
    }

    const result = await createGoalPlan({ rawGoal: rawGoal.trim(), context });

    if (result.success && result.goal) {
      goalStore.add(result.goal);
      return NextResponse.json({
        goal: result.goal,
        voiceResponse: result.voiceResponse,
      });
    }

    return NextResponse.json({ error: result.error ?? "Failed to create plan" }, { status: 500 });
  } catch (err) {
    console.error("[/api/goals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* GET /api/goals — list all goals */
export async function GET() {
  try {
    const goals = goalStore.getAll();
    const voiceResponse = summariseGoals(goals);
    return NextResponse.json({ goals, voiceResponse });
  } catch (err) {
    console.error("[/api/goals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* PATCH /api/goals — update an existing goal plan */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, patch } = body as { id: string; patch: Partial<Goal> };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const success = goalStore.update(id, patch);
    if (success) {
      const updated = goalStore.getById(id);
      return NextResponse.json({ success: true, goal: updated });
    }

    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  } catch (err) {
    console.error("[/api/goals PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
