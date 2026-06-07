import { NextRequest, NextResponse } from "next/server";
import { llmRouter } from "@/lib/llm";
import type { ChatTurn } from "@/lib/llm";
import {
  detectIntent,
  calculate,
  spokenNumber,
  toolCreateTask,
  toolCreateNote,
  toolGetTasks,
  toolGetNotes,
  type ToolStore,
} from "@/lib/tools";
import { detectGoalIntent, createGoalPlan, summariseGoals, goalStore } from "@/lib/goals";
import { requiresCouncil, runCouncil } from "@/lib/council";
import { config } from "@/config";

/* ─── Types ──────────────────────────────────────────────────── */
export type AgentMode = "general" | "planner" | "tutor" | "research";

export interface MemoryTurn {
  user: string;
  assistant: string;
  mode: AgentMode;
}

/* ─── System prompts per mode ────────────────────────────────── */
const SYSTEM_PROMPTS: Record<AgentMode, string> = {
  general: `${config.constants.systemPrompts.general}\n${config.constants.voiceRules}`,
  planner: `${config.constants.systemPrompts.planner}\n${config.constants.voiceRules}`,
  tutor: `${config.constants.systemPrompts.tutor}\n${config.constants.voiceRules}`,
  research: `${config.constants.systemPrompts.research}\n${config.constants.voiceRules}`,
};

/* ─── Memory context builder ─────────────────────────────────── */
function buildMemoryContext(memory: MemoryTurn[]): string {
  if (!memory || memory.length === 0) return "";
  const lines = memory.map((t, i) => {
    const tag = t.mode !== "general" ? ` [${t.mode}]` : "";
    return `Turn ${i + 1}${tag}:\nUser: ${t.user}\nAssistant: ${t.assistant}`;
  });
  return `\n\nSession memory (${memory.length} turns):\n${lines.join("\n\n")}`;
}

/* ─── Route handler ──────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, mode, memory, store } = body as {
      message: string;
      mode?: AgentMode;
      memory?: MemoryTurn[];
      store?: ToolStore;
    };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const activeMode: AgentMode =
      mode && ["general", "planner", "tutor", "research"].includes(mode) ? mode : "general";

    const safeMemory: MemoryTurn[] = Array.isArray(memory) ? memory.slice(-10) : [];
    const safeStore: ToolStore = {
      tasks: Array.isArray(store?.tasks) ? store.tasks : [],
      notes: Array.isArray(store?.notes) ? store.notes : [],
    };

    const text = message.trim();

    /* ── Step 1a: Goal intent detection ── */
    const goalIntent = detectGoalIntent(text);

    if (goalIntent === "createGoal") {
      const result = await createGoalPlan({ rawGoal: text });
      if (result.success && result.goal) {
        goalStore.add(result.goal);
        return NextResponse.json({
          response: result.voiceResponse,
          toolUsed: "createGoal",
          goal: result.goal,
          mode: activeMode,
        });
      }
    }

    if (goalIntent === "listGoals" || goalIntent === "goalStatus") {
      const goals = goalStore.getAll();
      const voiceResponse = summariseGoals(goals);
      return NextResponse.json({
        response: voiceResponse,
        toolUsed: "listGoals",
        goals,
        mode: activeMode,
      });
    }

    /* ── Step 1b: Tool intent detection — runs without LLM ── */
    const intent = detectIntent(text);

    if (intent === "calculate") {
      const result = calculate(text);
      return NextResponse.json({
        response:
          result !== null
            ? `The answer is ${spokenNumber(result)}.`
            : "I could not parse that calculation. Please rephrase it.",
        toolUsed: "calculate",
        mode: activeMode,
      });
    }
    if (intent === "createTask") {
      const r = toolCreateTask(text, safeStore);
      return NextResponse.json({
        response: r.voiceResponse,
        toolUsed: "createTask",
        updatedStore: r.updatedStore,
        mode: activeMode,
      });
    }
    if (intent === "createNote") {
      const r = toolCreateNote(text, safeStore);
      return NextResponse.json({
        response: r.voiceResponse,
        toolUsed: "createNote",
        updatedStore: r.updatedStore,
        mode: activeMode,
      });
    }
    if (intent === "getTasks") {
      const r = toolGetTasks(safeStore);
      return NextResponse.json({
        response: r.voiceResponse,
        toolUsed: "getTasks",
        mode: activeMode,
      });
    }
    if (intent === "getNotes") {
      const r = toolGetNotes(safeStore);
      return NextResponse.json({
        response: r.voiceResponse,
        toolUsed: "getNotes",
        mode: activeMode,
      });
    }

    /* ── Step 2: Council check — complex requests ── */
    if (requiresCouncil(text)) {
      const councilResult = await runCouncil({
        userRequest: text,
        memory: safeMemory,
        goals: goalStore.getAll(),
        store: safeStore,
      });
      return NextResponse.json({
        response: councilResult.voiceResponse,
        toolUsed: "council",
        councilResult,
        mode: activeMode,
      });
    }

    /* ── Step 3: Route to LLM via the abstraction layer ── */
    const temperature = activeMode === "tutor" ? 0.5 : activeMode === "research" ? 0.3 : 0.4;
    let systemPromptBase = "";
    switch (activeMode) {
      case "general": {
        systemPromptBase = SYSTEM_PROMPTS.general;
        break;
      }
      case "planner": {
        systemPromptBase = SYSTEM_PROMPTS.planner;
        break;
      }
      case "tutor": {
        systemPromptBase = SYSTEM_PROMPTS.tutor;
        break;
      }
      case "research": {
        systemPromptBase = SYSTEM_PROMPTS.research;
        break;
      }
      default: {
        systemPromptBase = SYSTEM_PROMPTS.general;
      }
    }
    const systemPrompt = systemPromptBase + buildMemoryContext(safeMemory);

    // Convert MemoryTurn[] → ChatTurn[] for the LLM layer
    const history: ChatTurn[] = safeMemory.flatMap((t) => [
      { role: "user" as const, content: t.user },
      { role: "assistant" as const, content: t.assistant },
    ]);

    const llmResult = await llmRouter.generate({
      prompt: text,
      systemPrompt,
      history,
      temperature,
      maxTokens: 200,
    });

    if (!llmResult.success) {
      // All providers failed — return structured error voice response
      return NextResponse.json({
        response: llmResult.message,
        toolUsed: "none",
        mode: activeMode,
        error: true,
      });
    }

    return NextResponse.json({
      response: llmResult.text,
      toolUsed: "none",
      provider: llmResult.provider,
      latencyMs: llmResult.latencyMs,
      mode: activeMode,
    });
  } catch (error) {
    console.error("[/api/agent]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
