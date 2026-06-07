import { NextRequest, NextResponse } from "next/server";
import { generateProactiveInsights } from "@/lib/recommendations/engine";
import type { ToolStore } from "@/lib/tools";
import type { MemoryTurn } from "@/app/api/agent/route";
import type { Goal } from "@/lib/goals/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goals, store, memory } = body as {
      goals?: Goal[];
      store?: ToolStore;
      memory?: MemoryTurn[];
    };

    const safeGoals = Array.isArray(goals) ? goals : [];
    const safeStore = {
      tasks: Array.isArray(store?.tasks) ? store.tasks : [],
      notes: Array.isArray(store?.notes) ? store.notes : [],
    };
    const safeMemory = Array.isArray(memory) ? memory : [];

    const insights = await generateProactiveInsights({
      goals: safeGoals,
      store: safeStore,
      memory: safeMemory,
    });

    return NextResponse.json(insights);
  } catch (err) {
    console.error("[/api/recommendations POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
