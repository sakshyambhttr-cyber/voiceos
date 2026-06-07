import { type ToolStore, type ToolName, type PendingAction } from "@/lib/tools";
import { gmailService } from "@/services/gmail";
import { calendarService } from "@/services/calendar";
import { youtubeService } from "@/services/youtube";
import { researchService } from "@/services/research";
import { YouTubeSearchTool, YouTubePlayTool } from "@/tools/youtube";
import { parseIntent } from "@/lib/intent";
import { handleBrowserAction, handleWikipediaSearch } from "@/lib/browser";
import { planner, isWorkflowRequest } from "@/lib/workflow/planner";
import { executeWorkflow } from "@/lib/workflow/executor";

export interface OrchestrationResult {
  tool: ToolName;
  success: boolean;
  voiceResponse: string;
  updatedStore: ToolStore;
  activeTab?: "console" | "gmail" | "calendar" | "research" | "media";
  browserAction?: any;
  pendingAction?: any;
  query?: string;
  debugLog?: any;
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
        const res = await executeWorkflow(store, store.activeWorkflow, true);
        return {
          tool: "confirmAction",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "calendar",
          debugLog: {
            intent: parseIntent(message),
            platform: "system",
            action: "confirm",
            extractedQuery: "",
            selectedTool: "confirmAction",
            selectedResult: "Workflow Confirmed",
          }
        };
      } else if (isCancel) {
        const updatedStore = {
          ...store,
          pendingAction: null,
          activeWorkflow: null,
        };
        return {
          tool: "cancelAction",
          success: true,
          voiceResponse: "Workflow cancelled. Staged request has been cleared.",
          updatedStore,
          debugLog: {
            intent: parseIntent(message),
            platform: "system",
            action: "cancel",
            extractedQuery: "",
            selectedTool: "cancelAction",
            selectedResult: "Workflow Cancelled",
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
        if (action.type === "sendEmail") {
          const draftId = (action.data as { draftId: string })?.draftId;
          const res = gmailService.sendEmail(store, draftId);
          return {
            tool: "confirmAction",
            success: true,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "gmail",
            debugLog: {
              intent: parseIntent(message),
              platform: "gmail",
              action: "send",
              extractedQuery: "",
              selectedTool: "confirmAction",
              selectedResult: "Email Sent",
            }
          };
        } else if (action.type === "createEvent") {
          const res = await calendarService.commitEvent(store, action.data as any);
          return {
            tool: "confirmAction",
            success: true,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "calendar",
            debugLog: {
              intent: parseIntent(message),
              platform: "calendar",
              action: "create",
              extractedQuery: "",
              selectedTool: "confirmAction",
              selectedResult: `Event Committed: ${(action.data as any).title}`,
            }
          };
        } else if (action.type === "updateEvent") {
          const { eventId, updates } = action.data as { eventId: string; updates: any };
          const res = await calendarService.updateEvent(store, eventId, updates);
          return {
            tool: "confirmAction",
            success: true,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "calendar",
            debugLog: {
              intent: parseIntent(message),
              platform: "calendar",
              action: "update",
              extractedQuery: "",
              selectedTool: "confirmAction",
              selectedResult: `Event Updated: ${eventId}`,
            }
          };
        } else if (action.type === "deleteEvent") {
          const { eventId } = action.data as { eventId: string };
          const res = await calendarService.deleteEvent(store, eventId);
          return {
            tool: "confirmAction",
            success: true,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "calendar",
            debugLog: {
              intent: parseIntent(message),
              platform: "calendar",
              action: "delete",
              extractedQuery: "",
              selectedTool: "confirmAction",
              selectedResult: `Event Deleted: ${eventId}`,
            }
          };
        }
      } else if (isCancel) {
        const updatedStore = {
          ...store,
          pendingAction: null,
        };
        return {
          tool: "cancelAction",
          success: true,
          voiceResponse: "Action cancelled. Staged request has been cleared.",
          updatedStore,
          debugLog: {
            intent: parseIntent(message),
            platform: "system",
            action: "cancel",
            extractedQuery: "",
            selectedTool: "cancelAction",
            selectedResult: "Action Cancelled",
          }
        };
      }
    }

    // ─── 0c. Multi-Step Workflow Trigger Check ───
    if (isWorkflowRequest(message)) {
      const plan = await planner.buildPlan(message);
      if (plan) {
        plan.status = "running";
        const res = await executeWorkflow(store, plan, false);
        return {
          tool: "confirmAction",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: plan.steps[plan.steps.length - 1].tool === "calendar" ? "calendar" : 
                     plan.steps[plan.steps.length - 1].tool === "notes" ? "research" : "console",
          debugLog: {
            intent: parseIntent(message),
            platform: "system",
            action: "workflow",
            extractedQuery: plan.original_goal,
            selectedTool: "workflow.run",
            selectedResult: res.voiceResponse,
          }
        };
      }
    }

    // ─── Intent Extraction Layer (Single-step YouTube/Google/Wikipedia) ───
    const intent = parseIntent(message);

    if (intent.platform === "wikipedia") {
      if (intent.action === "open" && (!intent.entity || intent.entity.toLowerCase() === "wikipedia")) {
        const res = handleBrowserAction("openWebsite", "wikipedia", store);
        return {
          tool: res.tool,
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
          browserAction: res.browserAction,
          debugLog: {
            intent,
            platform: "wikipedia",
            action: "open",
            extractedQuery: "",
            selectedTool: "openWebsite",
            selectedResult: "https://www.wikipedia.org",
          }
        };
      }
      if (intent.action === "search") {
        const res = handleWikipediaSearch(intent.entity, store);
        return {
          tool: res.tool,
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
          browserAction: res.browserAction,
          query: intent.entity,
          debugLog: {
            intent,
            platform: "wikipedia",
            action: intent.action,
            extractedQuery: intent.entity,
            selectedTool: res.tool,
            selectedResult: `Wikipedia Search: ${intent.entity}`,
          },
        };
      }
    }

    if (intent.platform === "google") {
      if (intent.action === "open" && (!intent.entity || intent.entity.toLowerCase() === "google")) {
        const res = handleBrowserAction("openWebsite", "google", store);
        return {
          tool: res.tool,
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
          browserAction: res.browserAction,
          debugLog: {
            intent,
            platform: "google",
            action: "open",
            extractedQuery: "",
            selectedTool: "openWebsite",
            selectedResult: "https://www.google.com",
          }
        };
      }
      if (intent.action === "search") {
        const res = handleBrowserAction("googleSearch", intent.entity, store);
        return {
          tool: res.tool,
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
          browserAction: res.browserAction,
          query: intent.entity,
          debugLog: {
            intent,
            platform: "google",
            action: intent.action,
            extractedQuery: intent.entity,
            selectedTool: res.tool,
            selectedResult: `Google Search: ${intent.entity}`,
          },
        };
      }
    }

    if (intent.platform === "youtube") {
      // 3a. Play Action
      if (intent.action === "play") {
        const res = YouTubePlayTool.execute(intent.entity, store);
        let currentStore = res.updatedStore || store;
        if (res.browserAction) {
          const newAction = {
            id: "browser-" + uid(),
            actionType: "youtubePlay" as const,
            target: res.videoUrl || res.query,
            createdAt: new Date().toISOString(),
          };
          currentStore = {
            ...currentStore,
            browserActions: [...(currentStore.browserActions || []), newAction]
          };
        }
        return {
          tool: "youtube.play",
          query: res.query,
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: currentStore,
          activeTab: "media",
          browserAction: res.browserAction,
          debugLog: {
            intent,
            platform: "youtube",
            action: "play",
            extractedQuery: intent.entity,
            selectedTool: "youtube.play",
            selectedResult: res.videoTitle || null,
          }
        };
      }
      
      // 3b. Search Action
      if (intent.action === "search" || intent.action === "open") {
        if (intent.action === "open" && (!intent.entity || intent.entity.toLowerCase() === "youtube")) {
          const res = handleBrowserAction("openWebsite", "youtube", store);
          return {
            tool: res.tool,
            success: res.success,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "media",
            browserAction: res.browserAction,
            debugLog: {
              intent,
              platform: "youtube",
              action: "open",
              extractedQuery: "",
              selectedTool: "openWebsite",
              selectedResult: "https://www.youtube.com",
            }
          };
        }

        const res = YouTubeSearchTool.execute(intent.entity, store);
        let currentStore = res.updatedStore || store;
        if (res.browserAction) {
          const newAction = {
            id: "browser-" + uid(),
            actionType: "youtubeSearch" as const,
            target: res.query,
            createdAt: new Date().toISOString(),
          };
          currentStore = {
            ...currentStore,
            browserActions: [...(currentStore.browserActions || []), newAction]
          };
        }
        return {
          tool: "youtube.search",
          query: res.query,
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: currentStore,
          activeTab: "media",
          browserAction: res.browserAction,
          debugLog: {
            intent,
            platform: "youtube",
            action: "search",
            extractedQuery: intent.entity,
            selectedTool: "youtube.search",
            selectedResult: res.videos && res.videos[0] ? res.videos[0].title : null,
          }
        };
      }
    }

    // ─── 1. Gmail Agent Classification ───
    const isGmailQuery = /\b(email|emails|gmail|inbox|mail|message|messages|draft|reply|sender|recipient)\b/.test(m);
    if (isGmailQuery) {
      // 1a. Read Inbox / Summarize
      if (/\b(read|inbox|check|unread|important|summarize|list)\b/.test(m) && !m.includes("draft") && !m.includes("reply")) {
        const onlyImportant = m.includes("important");
        const res = gmailService.readInbox(store, onlyImportant);
        
        const updatedStore = {
          ...store,
          learningInterests: [...(store.learningInterests || []), "emails"],
        };

        return {
          tool: "readInbox",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore,
          activeTab: "gmail",
        };
      }

      // 1b. Draft Email
      if (/\b(draft|reply|compose|write|create draft)\b/.test(m)) {
        let to = "recipient@example.com";
        const toMatch = m.match(/to\s+([a-zA-Z0-9_\-\.]+)/);
        if (toMatch) {
          to = toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1);
          if (!to.includes("@")) to = `${to}@example.com`;
        } else if (m.includes("murf")) {
          to = "support@murf.ai";
        }

        let subject = "Follow-up Sync";
        if (m.includes("follow-up")) {
          subject = "Follow-up Sync";
        } else if (m.includes("reply")) {
          subject = "Re: Falcon Voice API Update";
        }

        let body = "Dear partner, I am writing to follow up on our latest conversation. Let me know when you are available.";
        if (m.includes("voice") || m.includes("loved")) {
          body = "Hi Murf, we loved your new Falcon v2 speech output. Let's schedule a call to sync up next week.";
        }

        const res = gmailService.draftEmail(store, to, subject, body);
        return {
          tool: "draftEmail",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "gmail",
        };
      }

      // 1c. Send Email
      if (m.startsWith("send ") || m.includes("send email") || m.includes("send the draft")) {
        const drafts = store.drafts || [];
        if (drafts.length > 0) {
          const latestDraft = drafts[drafts.length - 1];
          const pendingAction: PendingAction = {
            id: "action-" + uid(),
            type: "sendEmail",
            description: `Send email to ${latestDraft.to} with subject "${latestDraft.subject}"`,
            data: { draftId: latestDraft.id },
          };
          const updatedStore = {
            ...store,
            pendingAction,
          };
          return {
            tool: "sendEmail",
            success: true,
            voiceResponse: `I've staged a request to send your draft to ${latestDraft.to}. Should I go ahead and send it?`,
            updatedStore,
            activeTab: "gmail",
          };
        } else {
          return {
            tool: "sendEmail",
            success: false,
            voiceResponse: "You don't have any active drafts to send. Create a draft first.",
            updatedStore: store,
            activeTab: "gmail",
          };
        }
      }
    }

    // ─── 2. Calendar Agent Classification ───
    const isCalendarQuery = /\b(calendar|schedule|meeting|meetings|event|events|reminder|reminders|appointment|appointments|briefing|agenda)\b/.test(m);
    if (isCalendarQuery) {
      // 2a. Morning Briefing
      if (/\b(morning briefing|daily schedule summary|briefing|daily focus|schedule summary)\b/.test(m)) {
        const voiceResponse = await calendarService.generateMorningBriefing(store);
        return {
          tool: "morningBriefing",
          success: true,
          voiceResponse,
          updatedStore: store,
          activeTab: "calendar",
        };
      }

      // 2b. Schedule Event (Automatic, unless conflict exists)
      if (/\b(schedule|add|create|book|appoint)\b/.test(m)) {
        let title = "Sync Meeting";
        const titleMatch = cleanTitle(message);
        if (titleMatch) title = titleMatch;

        const { isoString } = parseDateTime(m);
        const res = await calendarService.scheduleEvent(store, title, isoString);

        if (res.conflict) {
          return {
            tool: "conflictCheck",
            success: false,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore || store,
            activeTab: "calendar",
          };
        }

        return {
          tool: "scheduleEvent",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore!,
          activeTab: "calendar",
        };
      }

      // 2c. Read Calendar
      if (/\b(read|show|list|meetings|events|schedule|agenda)\b/.test(m)) {
        const period = m.includes("week") ? "week" : "today";
        const res = await calendarService.readCalendar(store, period);
        return {
          tool: "readCalendar",
          success: res.success,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore || store,
          activeTab: "calendar",
        };
      }

      // 2d. Move/Update Event (Staged for safety confirmation)
      if (/\b(move|reschedule|change|shift)\b/.test(m)) {
        const targetEvent = store.calendarEvents?.[0] || { id: "cal-1", title: "Electronics Lecture" };
        let dateLabel = "Friday";
        let newStartTime = "2026-06-12T13:00:00.000Z";
        let newEndTime = "2026-06-12T14:30:00.000Z";

        if (m.includes("monday")) {
          dateLabel = "Monday";
          newStartTime = "2026-06-08T14:00:00.000Z";
          newEndTime = "2026-06-08T15:30:00.000Z";
        }

        const pendingAction: PendingAction = {
          id: "action-" + uid(),
          type: "updateEvent",
          description: `Move "${targetEvent.title}" to ${dateLabel}`,
          data: {
            eventId: targetEvent.id,
            updates: { startTime: newStartTime, endTime: newEndTime }
          }
        };

        return {
          tool: "scheduleEvent",
          success: true,
          voiceResponse: `I've prepared to move your meeting "${targetEvent.title}" to ${dateLabel}. Should I go ahead?`,
          updatedStore: {
            ...store,
            pendingAction
          },
          activeTab: "calendar",
        };
      }

      // 2e. Delete Event (Staged for safety confirmation)
      if (/\b(delete|remove|cancel)\b/.test(m)) {
        const targetEvent = store.calendarEvents?.find(e => e.startTime.includes("2026-06-08")) || store.calendarEvents?.[1] || { id: "cal-2", title: "Study Group - NumPy Exercises" };

        const pendingAction: PendingAction = {
          id: "action-" + uid(),
          type: "deleteEvent",
          description: `Delete event "${targetEvent.title}"`,
          data: { eventId: targetEvent.id }
        };

        return {
          tool: "scheduleEvent",
          success: true,
          voiceResponse: `I've prepared to delete "${targetEvent.title}". Should I go ahead and delete it?`,
          updatedStore: {
            ...store,
            pendingAction
          },
          activeTab: "calendar",
        };
      }
    }

    // ─── 3. Media & Knowledge Agent Classification (Legacy Search/Play Fallbacks) ───
    const isYoutube = /\b(youtube|yt|video|videos|play|watch|listen|start|search|find|show\s+me|tutorial|tutorials|course|courses|song|songs|bhajan|music|podcast|podcasts|highlights)\b/.test(m);
    if (isYoutube) {
      if (/\b(recommendation|recommendations|what should i watch|suggest videos)\b/.test(m)) {
        const res = youtubeService.getLearningRecommendations(store);
        return {
          tool: "youtubeRecommendations",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: store,
          activeTab: "media",
        };
      }

      if (/\b(educational|explain|explaining|course|courses|learn|study|discover)\b/.test(m)) {
        const query = m.replace(/^(find\s+videos\s+explaining|find\s+courses\s+about|find|explain|discover)\s+/i, "").trim();
        const res = youtubeService.search(query);
        const updatedStore = {
          ...store,
          learningInterests: [...(store.learningInterests || []), query],
        };
        return {
          tool: "youtubeEducational",
          success: true,
          voiceResponse: `Here is what I found about ${query} on YouTube. ` + res.voiceResponse,
          updatedStore,
          activeTab: "media",
        };
      }
    }

    // ─── 4. Research Agent Classification ───
    const isResearch = /\b(research|paper|papers|framework|frameworks|compare|comparison|architecture|documentation|docs|api)\b/.test(m);
    if (isResearch) {
      if (/\b(compare|versus|vs)\b/.test(m)) {
        let itemA = "PyTorch";
        let itemB = "TensorFlow";

        const compareMatch = m.match(/compare\s+([a-zA-Z0-9_\-\.]+)\s+(?:vs|versus|and)\s+([a-zA-Z0-9_\-\.]+)/i);
        if (compareMatch) {
          itemA = compareMatch[1].charAt(0).toUpperCase() + compareMatch[1].slice(1);
          itemB = compareMatch[2].charAt(0).toUpperCase() + compareMatch[2].slice(1);
        }

        const res = researchService.compareFrameworks(store, itemA, itemB);
        return {
          tool: "researchCompare",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
        };
      }

      if (/\b(docs|api|documentation|technical docs)\b/.test(m)) {
        let docTitle = "Active API Interface";
        const docsMatch = m.match(/documentation\s+for\s+([a-zA-Z0-9_\-\.\s]+)/i);
        if (docsMatch) {
          docTitle = docsMatch[1].trim();
        }

        const res = researchService.analyzeDocs(store, docTitle);
        return {
          tool: "researchDocs",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: store,
          activeTab: "research",
        };
      }

      if (/\b(analyze|summarize|read)\b/.test(m)) {
        let paperTitle = "Attention Is All You Need";
        const paperMatch = m.match(/(?:analyze|summarize|read)\s+(?:paper|research paper)\s+([a-zA-Z0-9_\-\.\s]+)/i);
        if (paperMatch) {
          paperTitle = paperMatch[1].trim();
        }

        const res = researchService.analyzePaper(store, paperTitle);
        return {
          tool: "researchPaper",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "research",
        };
      }
    }

    return null;
  }
};

// Strips out filler words to get a clean calendar event title
function cleanTitle(msg: string): string {
  let title = msg.trim();
  title = title
    .replace(/^(schedule\s+a\s+meeting|schedule\s+meeting|schedule\s+event|schedule|add\s+event|add\s+meeting|add\s+reminder|remind\s+me)\s*/i, "")
    .replace(/\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|at \d+\s*(?:am|pm|pm)?)\b/gi, "")
    .replace(/\b(at|on|for|tomorrow|today)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  if (title) {
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  return "Sync Meeting";
}
