import { NextRequest, NextResponse } from "next/server";
import { runCouncil } from "@/lib/council";
import { goalStore } from "@/lib/goals";
import type { MemoryTurn } from "@/app/api/agent/route";
import type { ToolStore } from "@/lib/tools";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, memory, store } = body as {
      message: string;
      memory?: MemoryTurn[];
      store?: ToolStore;
    };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await runCouncil({
      userRequest: message.trim(),
      memory: Array.isArray(memory) ? memory.slice(-10) : [],
      goals: goalStore.getAll(),
      store: {
        tasks: Array.isArray(store?.tasks) ? store.tasks : [],
        notes: Array.isArray(store?.notes) ? store.notes : [],
      },
    });

    return NextResponse.json({
      response: result.voiceResponse,
      councilResult: result,
      toolUsed: "council",
    });
  } catch (err) {
    console.error("[/api/council]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
