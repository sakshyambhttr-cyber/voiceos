import { type NormalizedIntent } from "./intent";
import { type ToolStore, type WorkflowState, type WorkflowStep } from "./tools";
import { ToolRegistry } from "./registry";

export interface ExecutableStep {
  tool: string;
  action: string;
  query: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
}

export function mapPlanToWorkflowState(
  originalGoal: string,
  plan: ExecutableStep[],
  currentIndex: number,
  status: "idle" | "running" | "waiting_confirmation" | "completed" | "failed",
  context: Record<string, any> = {}
): WorkflowState {
  return {
    workflow_id: "wf-" + Date.now().toString(36),
    original_goal: originalGoal,
    steps: plan.map((step, idx) => ({
      step: idx + 1,
      tool: mapToolToUITool(step.tool),
      action: `${step.tool}.${step.action}${step.query ? "(" + step.query + ")" : ""}`,
      status: step.status === "running" ? "pending" : (step.status as any),
      resultData: step.result
    })),
    completed_steps: plan
      .map((step, idx) => (step.status === "completed" ? idx + 1 : -1))
      .filter((idx) => idx !== -1),
    failed_steps: plan
      .map((step, idx) => (step.status === "failed" ? idx + 1 : -1))
      .filter((idx) => idx !== -1),
    current_step_index: currentIndex,
    status: status,
    context: context
  };
}

function mapToolToUITool(tool: string): any {
  if (tool === "youtube") return "research"; 
  if (tool === "calendar") return "calendar";
  if (tool === "gmail") return "gmail";
  if (tool === "research") return "research";
  if (tool === "system") return "tasks";
  return "research";
}

export function buildPlanFromIntent(intent: NormalizedIntent): ExecutableStep[] {
  const qLower = intent.query.toLowerCase();

  // Multi-step templates
  if (intent.intent === "workflow_run") {
    if (qLower.includes("f1") || qLower.includes("formula")) {
      return [
        { tool: "research", action: "find_next_f1_race", query: "", status: "pending" },
        { tool: "calendar", action: "create_event", query: "", status: "pending" }
      ];
    }
    if (qLower.includes("exam") || qLower.includes("electronics")) {
      return [
        { tool: "research", action: "find_exam_date", query: "", status: "pending" },
        { tool: "calendar", action: "create_event", query: "", status: "pending" }
      ];
    }
    if (qLower.includes("email") || qLower.includes("gmail")) {
      return [
        { tool: "gmail", action: "read_inbox", query: "", status: "pending" },
        { tool: "system", action: "create_task", query: "", status: "pending" }
      ];
    }
    if (qLower.includes("research") || qLower.includes("paper")) {
      return [
        { tool: "research", action: "paper", query: "Attention Is All You Need", status: "pending" },
        { tool: "system", action: "create_note", query: "", status: "pending" }
      ];
    }
  }

  // Single step mappings
  if (intent.intent === "play_media") {
    return [{ tool: "youtube", action: "play", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "search_media") {
    return [{ tool: "youtube", action: "search", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "research_topic") {
    if (intent.platform === "wikipedia") {
      return [{ tool: "system", action: "wikipedia_search", query: intent.query, status: "pending" }];
    }
    return [{ tool: "system", action: "google_search", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "open_website") {
    return [{ tool: "system", action: "open_website", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calendar_morning_briefing") {
    return [{ tool: "calendar", action: "morning_briefing", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calendar_create_event") {
    return [{ tool: "calendar", action: "create_event", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calendar_read") {
    return [{ tool: "calendar", action: "read", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calendar_update_event") {
    return [{ tool: "calendar", action: "update", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calendar_delete_event") {
    return [{ tool: "calendar", action: "delete", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "gmail_read_inbox") {
    return [{ tool: "gmail", action: "read_inbox", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "gmail_draft_email") {
    return [{ tool: "gmail", action: "draft_email", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "gmail_send_email") {
    return [{ tool: "gmail", action: "send_email", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "research_compare") {
    return [{ tool: "research", action: "compare", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "research_docs") {
    return [{ tool: "research", action: "docs", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "research_paper") {
    return [{ tool: "research", action: "paper", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "calculate") {
    return [{ tool: "system", action: "calculate", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "create_task") {
    return [{ tool: "system", action: "create_task", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "create_note") {
    return [{ tool: "system", action: "create_note", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "get_tasks") {
    return [{ tool: "system", action: "get_tasks", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "get_notes") {
    return [{ tool: "system", action: "get_notes", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "confirm_action") {
    return [{ tool: "system", action: "confirm", query: intent.query, status: "pending" }];
  }
  if (intent.intent === "cancel_action") {
    return [{ tool: "system", action: "cancel", query: intent.query, status: "pending" }];
  }

  // Fallback: search Google
  return [{ tool: "system", action: "google_search", query: intent.query, status: "pending" }];
}

export async function executePlan(
  plan: ExecutableStep[],
  store: ToolStore,
  isConfirmed = false
): Promise<{
  success: boolean;
  voiceResponse: string;
  updatedStore: ToolStore;
  activeTab?: "console" | "gmail" | "calendar" | "research" | "media";
  browserAction?: any;
  debugLog?: Record<string, any>;
}> {
  let currentStore = { ...store };
  let context: any = { isConfirmed };
  let finalResponse = "";
  let finalTab: any = undefined;
  let finalBrowserAction: any = undefined;

  const originalGoal = store.activeWorkflow?.original_goal || plan[0]?.query || "Voice Command Execution";

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    step.status = "running";

    // Set UI workflow state to running
    currentStore.activeWorkflow = mapPlanToWorkflowState(originalGoal, plan, i, "running", context);

    try {
      console.log(`[Execution Engine] Executing Step ${i + 1}/${plan.length}: ${step.tool}.${step.action}`);
      const handler = ToolRegistry.getAction(step.tool, step.action);
      if (!handler) {
        throw new Error(`No handler registered for tool action ${step.tool}.${step.action}`);
      }

      const res = await handler(step.query, currentStore, context);
      
      step.status = "completed";
      step.result = res.displayData || res.voiceResponse;
      currentStore = res.updatedStore;
      context.lastResult = res.displayData || res.voiceResponse;
      if (step.tool === "research" && step.action.startsWith("find_")) {
        context.eventDetails = {
          title: step.action === "find_next_f1_race" ? "Japanese Grand Prix" : "Electronics Final Exam",
          startTime: step.action === "find_next_f1_race" ? "2027-04-05T05:00:00.000Z" : "2026-06-12T10:00:00.000Z",
          duration: step.action === "find_next_f1_race" ? 120 : 180,
        };
      }
      
      if (res.activeTab) finalTab = res.activeTab;
      if (res.browserAction) finalBrowserAction = res.browserAction;
      
      // Stage pendingActions / workflow state transitions
      if (currentStore.activeWorkflow?.status === "waiting_confirmation" || currentStore.pendingAction) {
        const stepStatus = "waiting_confirmation";
        currentStore.activeWorkflow = mapPlanToWorkflowState(originalGoal, plan, i, stepStatus, context);
        return {
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: currentStore,
          activeTab: res.activeTab,
          browserAction: res.browserAction
        };
      }

      finalResponse = res.voiceResponse;
      const isLast = i === plan.length - 1;
      const stepStatus = isLast ? "completed" : "running";
      currentStore.activeWorkflow = mapPlanToWorkflowState(originalGoal, plan, i + 1, stepStatus as any, context);
    } catch (err: any) {
      console.error(`[Execution Engine] Error in Step ${step.tool}.${step.action}:`, err);
      step.status = "failed";
      step.result = err.message || String(err);
      currentStore.activeWorkflow = mapPlanToWorkflowState(originalGoal, plan, i, "failed", context);
      return {
        success: false,
        voiceResponse: `An error occurred at step ${i + 1}: ${err.message}`,
        updatedStore: currentStore
      };
    }
  }

  // Clear workflow state on success
  if (currentStore.activeWorkflow) {
    currentStore.activeWorkflow.status = "completed";
  }

  return {
    success: true,
    voiceResponse: finalResponse,
    updatedStore: currentStore,
    activeTab: finalTab,
    browserAction: finalBrowserAction
  };
}

