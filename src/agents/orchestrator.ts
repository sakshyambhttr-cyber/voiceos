import { type ToolStore, type ToolName, type PendingAction, type BrowserAction } from "@/lib/tools";
import type { CalendarEventSchema } from "@/lib/calendar/types";
import { gmailService } from "@/services/gmail";
import { calendarService } from "@/services/calendar";
import { youtubeService } from "@/services/youtube";
import { researchService } from "@/services/research";
import { YouTubeSearchTool, YouTubePlayTool } from "@/tools/youtube";
import { parseIntent, getNormalizedIntent } from "@/lib/intent";
import { handleBrowserAction, handleWikipediaSearch } from "@/lib/browser";
import { planner, isWorkflowRequest } from "@/lib/workflow/planner";
import { executeWorkflow } from "@/lib/workflow/executor";
import { buildPlanFromIntent, executePlan, mapPlanToWorkflowState, type ExecutableStep } from "@/lib/planner";

export interface OrchestrationResult {
  tool: ToolName;
  success: boolean;
  voiceResponse: string;
  updatedStore: ToolStore;
  activeTab?: "console" | "gmail" | "calendar" | "research" | "media";
  browserAction?: {
    actionType: "open" | "googleSearch" | "youtubeSearch" | "youtubePlay" | "wikipediaSearch";
    target: string;
  };
  pendingAction?: PendingAction | null;
  query?: string;
  debugLog?: Record<string, unknown>;
}

// Parses meeting times relative to mock session time: Sunday, June 7, 2026, 11:03 AM
function parseDateTime(text: string): { isoString: string; displayStr: string } {
  const m = text.toLowerCase();
  const baseDate = new Date("2026-06-07T11:03:48+05:45");
  const targetDate = new Date(baseDate);

  // Determine date
  if (m.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (m.includes("friday")) {
    // June 7 is Sunday. Friday is June 12
    const daysToAdd = (5 - targetDate.getDay() + 7) % 7;
    targetDate.setDate(targetDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
  } else if (m.includes("monday")) {
    const daysToAdd = (1 - targetDate.getDay() + 7) % 7;
    targetDate.setDate(targetDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
  }

  // Determine time (default to 4 PM if not specified)
  let hour = 16;
  const minute = 0;
  
  const timeMatch = m.match(/at\s+(\d+)(?:\s*(am|pm))?/);
  if (timeMatch) {
    let parsedHour = parseInt(timeMatch[1]);
    const ampm = timeMatch[2];
    if (ampm === "pm" && parsedHour < 12) parsedHour += 12;
    if (ampm === "am" && parsedHour === 12) parsedHour = 0;
    hour = parsedHour;
  } else if (m.includes("2 pm") || m.includes("2pm") || m.includes("14:00")) {
    hour = 14;
  } else if (m.includes("1 pm") || m.includes("1pm")) {
    hour = 13;
  } else if (m.includes("3 pm") || m.includes("3pm")) {
    hour = 15;
  }

  targetDate.setHours(hour, minute, 0, 0);

  const displayStr = targetDate.toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  return {
    isoString: targetDate.toISOString(),
    displayStr,
  };
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const orchestrator = {
  /**
   * Evaluates the query, routes to appropriate agent, executes it, and updates memory/store.
   */
  async process(message: string, store: ToolStore): Promise<OrchestrationResult | null> {
    const m = message.toLowerCase().trim();

    // ─── 0a. Active Workflow Safety Confirmation Checks ───
    if (store.activeWorkflow && store.activeWorkflow.status === "waiting_confirmation") {
      const isConfirm = /\b(yes|confirm|approve|go ahead|send it|schedule it|ok|yep|sure)\b/.test(m);
      const isCancel = /\b(no|cancel|reject|don't|stop|hold on|abort|nope)\b/.test(m);

      if (isConfirm) {
        const remainingPlan: ExecutableStep[] = store.activeWorkflow.steps.slice(store.activeWorkflow.current_step_index).map(step => {
          const match = step.action.match(/^([^.]+)\.([^(]+)(?:\((.*)\))?/);
          return {
            tool: match ? match[1] : "",
            action: match ? match[2] : "",
            query: match ? match[3] || "" : "",
            status: "pending" as const
          };
        });

        const res = await executePlan(remainingPlan, store, true);
        const originalGoal = store.activeWorkflow.original_goal;
        const currentIdx = store.activeWorkflow.current_step_index + remainingPlan.filter(s => s.status === "completed").length;
        
        const finalStatus = res.updatedStore.activeWorkflow?.status || "completed";
        const updatedWorkflow = mapPlanToWorkflowState(
          originalGoal,
          remainingPlan,
          currentIdx,
          finalStatus as any,
          res.updatedStore.activeWorkflow?.context || {}
        );

        const updatedStore = {
          ...res.updatedStore,
          activeWorkflow: updatedWorkflow.status === "completed" ? null : updatedWorkflow
        };

        const intent = getNormalizedIntent(message);
        return {
          tool: "confirmAction",
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore,
          activeTab: res.activeTab,
          browserAction: res.browserAction,
          debugLog: {
            platform: "system",
            action: "confirm",
            extractedQuery: "",
            selectedTool: "confirmAction",
            intent: intent
          }
        };
      } else if (isCancel) {
        const updatedStore = {
          ...store,
          pendingAction: null,
          activeWorkflow: null,
        };
        const intent = getNormalizedIntent(message);
        return {
          tool: "cancelAction",
          success: true,
          voiceResponse: "Workflow cancelled. Staged request has been cleared.",
          updatedStore,
          debugLog: {
            platform: "system",
            action: "cancel",
            extractedQuery: "",
            selectedTool: "cancelAction",
            intent: intent
          }
        };
      }
    }

    // ─── 0b. Single-Step pendingAction Confirmation / Approval checks ───
    if (store.pendingAction) {
      const isConfirm = /\b(yes|confirm|approve|go ahead|send it|schedule it|ok|yep|sure)\b/.test(m);
      const isCancel = /\b(no|cancel|reject|don't|stop|hold on|abort|nope)\b/.test(m);

      if (isConfirm) {
        const action = store.pendingAction;
        let plan: ExecutableStep[] = [];
        if (action.type === "sendEmail") {
          plan = [{ tool: "gmail", action: "send_email", query: "", status: "pending" }];
        } else if (action.type === "createEvent") {
          plan = [{ tool: "calendar", action: "create_event", query: "", status: "pending" }];
        } else if (action.type === "updateEvent") {
          plan = [{ tool: "calendar", action: "update", query: "", status: "pending" }];
        } else if (action.type === "deleteEvent") {
          plan = [{ tool: "calendar", action: "delete", query: "", status: "pending" }];
        }

        if (plan.length > 0) {
          const res = await executePlan(plan, store, true);
          const updatedStore = {
            ...res.updatedStore,
            pendingAction: null
          };
          const intent = getNormalizedIntent(message);
          return {
            tool: "confirmAction",
            success: res.success,
            voiceResponse: res.voiceResponse,
            updatedStore,
            activeTab: res.activeTab,
            browserAction: res.browserAction,
            debugLog: {
              platform: "system",
              action: "confirm",
              extractedQuery: "",
              selectedTool: "confirmAction",
              intent: intent
            }
          };
        }
      } else if (isCancel) {
        const updatedStore = {
          ...store,
          pendingAction: null,
        };
        const intent = getNormalizedIntent(message);
        return {
          tool: "cancelAction",
          success: true,
          voiceResponse: "Action cancelled. Staged request has been cleared.",
          updatedStore,
          debugLog: {
            platform: "system",
            action: "cancel",
            extractedQuery: "",
            selectedTool: "cancelAction",
            intent: intent
          }
        };
      }
    }

    // ─── 1. Intent Extraction Layer ───
    const intent = getNormalizedIntent(message);
    if (intent.intent === "none") {
      return null;
    }

    // ─── 2. Planner Layer ───
    const plan = buildPlanFromIntent(intent);

    // ─── 3. Tool Selection & Execution ───
    const res = await executePlan(plan, store, false);

    // ─── 4. Debug Output ───
    const debugLog = {
      platform: intent.platform,
      action: intent.intent,
      extractedQuery: intent.query,
      selectedTool: plan.map(s => `${s.tool}.${s.action}`).join(", "),
      intent: intent
    };

    // Determine the tool name for result
    const lastStep = plan[plan.length - 1];
    let toolName: ToolName = "none";
    if (lastStep) {
      if (lastStep.tool === "youtube") {
        toolName = lastStep.action === "play" ? "youtube.play" : "youtube.search";
      } else {
        toolName = lastStep.tool as any;
      }
    }

    let currentStore = res.updatedStore;
    if (res.browserAction) {
      const newAction = {
        id: "browser-" + uid(),
        actionType: res.browserAction.actionType,
        target: res.browserAction.target,
        createdAt: new Date().toISOString(),
      };
      currentStore = {
        ...currentStore,
        browserActions: [...(currentStore.browserActions || []), newAction]
      };
    }

    return {
      tool: toolName,
      success: res.success,
      voiceResponse: res.voiceResponse,
      updatedStore: currentStore,
      activeTab: res.activeTab,
      browserAction: res.browserAction,
      debugLog
    };
  }
};

