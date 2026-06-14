import { type ToolStore, type ToolResult, toolCreateTask, toolCreateNote, toolGetTasks, toolGetNotes, calculate, spokenNumber } from "./tools";
import { youtubeService, type YouTubeVideo } from "@/services/youtube";
import { YouTubePlayTool, YouTubeSearchTool } from "@/tools/youtube";
import { gmailService } from "@/services/gmail";
import { calendarService } from "@/services/calendar";
import { researchService } from "@/services/research";
import { handleBrowserAction, handleWikipediaSearch } from "@/lib/browser";
import type { CalendarEventSchema } from "@/lib/calendar/types";

export interface ToolActionHandler {
  (query: string, store: ToolStore, context?: any): Promise<{
    success: boolean;
    voiceResponse: string;
    updatedStore: ToolStore;
    displayData?: any;
    browserAction?: any;
    activeTab?: "console" | "gmail" | "calendar" | "research" | "media";
    videoUrl?: string;
    videoTitle?: string;
  }>;
}

export interface RegisteredTool {
  name: string;
  actions: Record<string, ToolActionHandler>;
}

export class ToolRegistry {
  private static tools: Record<string, RegisteredTool> = {};

  static register(tool: RegisteredTool) {
    this.tools[tool.name] = tool;
  }

  static get(name: string): RegisteredTool | undefined {
    return this.tools[name];
  }

  static getAction(toolName: string, actionName: string): ToolActionHandler | undefined {
    return this.tools[toolName]?.actions[actionName];
  }
}

// 1. YouTube Tool Registration
ToolRegistry.register({
  name: "youtube",
  actions: {
    play: async (query, store) => {
      const res = YouTubePlayTool.execute(query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore || store,
        activeTab: "media" as const,
        browserAction: res.browserAction,
        videoUrl: res.videoUrl,
        videoTitle: res.videoTitle,
        displayData: res.debugLog,
      };
    },
    search: async (query, store) => {
      const res = YouTubeSearchTool.execute(query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore || store,
        activeTab: "media" as const,
        browserAction: res.browserAction,
        displayData: res.debugLog,
      };
    },
    recommendations: async (_query, store) => {
      const res = youtubeService.getLearningRecommendations(store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: store,
        activeTab: "media" as const,
      };
    }
  }
});

// 2. Calendar Tool Registration
ToolRegistry.register({
  name: "calendar",
  actions: {
    morning_briefing: async (query, store) => {
      const voiceResponse = await calendarService.generateMorningBriefing(store);
      return {
        success: true,
        voiceResponse,
        updatedStore: store,
        activeTab: "calendar"
      };
    },
    create_event: async (query, store, context) => {
      // If we are in workflow execution and need to extract event details from previous step's search results
      if (context && !context.eventDetails && context.lastResult) {
        const lastResult = String(context.lastResult).toLowerCase();
        if (lastResult.includes("japanese") || lastResult.includes("f1")) {
          context.eventDetails = {
            title: "Japanese Grand Prix",
            startTime: "2027-04-05T05:00:00.000Z",
            duration: 120,
          };
        } else if (lastResult.includes("exam") || lastResult.includes("electronics")) {
          context.eventDetails = {
            title: "Electronics Final Exam",
            startTime: "2026-06-12T10:00:00.000Z",
            duration: 180,
          };
        }
      }

      // If we are in workflow execution and already extracted eventDetails:
      if (context && context.eventDetails) {
        const event = context.eventDetails;
        if (context.isConfirmed) {
          if (store.pendingAction && store.pendingAction.type === "createEvent") {
            const res = await calendarService.commitEvent(store, store.pendingAction.data as CalendarEventSchema);
            return {
              success: true,
              voiceResponse: res.voiceResponse,
              updatedStore: res.updatedStore,
              activeTab: "calendar"
            };
          }
        } else {
          const res = await calendarService.scheduleEvent(store, event.title, event.startTime, event.duration);
          return {
            success: !res.conflict,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore || store,
            activeTab: "calendar"
          };
        }
      }

      // Single step scheduling
      let title = "Sync Meeting";
      const cleanTitle = (msg: string): string => {
        let t = msg.trim()
          .replace(/^(schedule\s+a\s+meeting|schedule\s+meeting|schedule\s+event|schedule|add\s+event|add\s+meeting|add\s+reminder|remind\s+me)\s*/i, "")
          .replace(/\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|at \d+\s*(?:am|pm|pm)?)\b/gi, "")
          .replace(/\b(at|on|for|tomorrow|today)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Sync Meeting";
      };
      
      const parseDateTime = (text: string) => {
        const m = text.toLowerCase();
        const baseDate = new Date("2026-06-07T11:03:48+05:45");
        const targetDate = new Date(baseDate);
        if (m.includes("tomorrow")) targetDate.setDate(targetDate.getDate() + 1);
        else if (m.includes("friday")) {
          const daysToAdd = (5 - targetDate.getDay() + 7) % 7;
          targetDate.setDate(targetDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        } else if (m.includes("monday")) {
          const daysToAdd = (1 - targetDate.getDay() + 7) % 7;
          targetDate.setDate(targetDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        }
        let hour = 16;
        const timeMatch = m.match(/at\s+(\d+)(?:\s*(am|pm))?/);
        if (timeMatch) {
          let parsedHour = parseInt(timeMatch[1]);
          const ampm = timeMatch[2];
          if (ampm === "pm" && parsedHour < 12) parsedHour += 12;
          if (ampm === "am" && parsedHour === 12) parsedHour = 0;
          hour = parsedHour;
        } else if (m.includes("2 pm") || m.includes("2pm") || m.includes("14:00")) hour = 14;
        else if (m.includes("1 pm") || m.includes("1pm")) hour = 13;
        else if (m.includes("3 pm") || m.includes("3pm")) hour = 15;
        targetDate.setHours(hour, 0, 0, 0);
        return targetDate.toISOString();
      };

      const titleStr = cleanTitle(query);
      const isoString = parseDateTime(query);
      const res = await calendarService.scheduleEvent(store, titleStr, isoString);
      return {
        success: !res.conflict,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore || store,
        activeTab: "calendar"
      };
    },
    read: async (query, store) => {
      const period = query.toLowerCase().includes("week") ? "week" : "today";
      const res = await calendarService.readCalendar(store, period);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore || store,
        activeTab: "calendar"
      };
    },
    update: async (query, store, context) => {
      if (context && context.isConfirmed && store.pendingAction && store.pendingAction.type === "updateEvent") {
        const { eventId, updates } = store.pendingAction.data as { eventId: string; updates: any };
        const res = await calendarService.updateEvent(store, eventId, updates);
        return {
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "calendar"
        };
      }

      const targetEvent = store.calendarEvents?.[0] || { id: "cal-1", title: "Electronics Lecture" };
      let dateLabel = "Friday";
      let newStartTime = "2026-06-12T13:00:00.000Z";
      let newEndTime = "2026-06-12T14:30:00.000Z";
      const m = query.toLowerCase();
      if (m.includes("monday")) {
        dateLabel = "Monday";
        newStartTime = "2026-06-08T14:00:00.000Z";
        newEndTime = "2026-06-08T15:30:00.000Z";
      }
      const pendingAction = {
        id: "action-" + Math.random().toString(36).slice(2, 6),
        type: "updateEvent" as const,
        description: `Move "${targetEvent.title}" to ${dateLabel}`,
        data: {
          eventId: targetEvent.id,
          updates: { startTime: newStartTime, endTime: newEndTime }
        }
      };
      return {
        success: true,
        voiceResponse: `I've prepared to move your meeting "${targetEvent.title}" to ${dateLabel}. Should I go ahead?`,
        updatedStore: {
          ...store,
          pendingAction
        },
        activeTab: "calendar"
      };
    },
    delete: async (query, store, context) => {
      if (context && context.isConfirmed && store.pendingAction && store.pendingAction.type === "deleteEvent") {
        const { eventId } = store.pendingAction.data as { eventId: string };
        const res = await calendarService.deleteEvent(store, eventId);
        return {
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "calendar"
        };
      }

      const targetEvent = store.calendarEvents?.find(e => e.startTime.includes("2026-06-08")) || store.calendarEvents?.[1] || { id: "cal-2", title: "Study Group - NumPy Exercises" };
      const pendingAction = {
        id: "action-" + Math.random().toString(36).slice(2, 6),
        type: "deleteEvent" as const,
        description: `Delete event "${targetEvent.title}"`,
        data: { eventId: targetEvent.id }
      };
      return {
        success: true,
        voiceResponse: `I've prepared to delete "${targetEvent.title}". Should I go ahead and delete it?`,
        updatedStore: {
          ...store,
          pendingAction
        },
        activeTab: "calendar"
      };
    }
  }
});

// 3. Gmail Tool Registration
ToolRegistry.register({
  name: "gmail",
  actions: {
    read_inbox: async (query, store) => {
      const onlyImportant = query.toLowerCase().includes("important");
      const res = gmailService.readInbox(store, onlyImportant);
      return {
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore: {
          ...store,
          learningInterests: [...(store.learningInterests || []), "emails"],
        },
        activeTab: "gmail"
      };
    },
    draft_email: async (query, store) => {
      let to = "recipient@example.com";
      const m = query.toLowerCase();
      const toMatch = m.match(/to\s+([a-zA-Z0-9_\-\.]+)/);
      if (toMatch) {
        to = toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1);
        if (!to.includes("@")) to = `${to}@example.com`;
      } else if (m.includes("murf")) {
        to = "support@murf.ai";
      }

      let subject = "Follow-up Sync";
      if (m.includes("follow-up")) subject = "Follow-up Sync";
      else if (m.includes("reply")) subject = "Re: Falcon Voice API Update";

      let body = "Dear partner, I am writing to follow up on our latest conversation. Let me know when you are available.";
      if (m.includes("voice") || m.includes("loved")) {
        body = "Hi Murf, we loved your new Falcon v2 speech output. Let's schedule a call to sync up next week.";
      }

      const res = gmailService.draftEmail(store, to, subject, body);
      return {
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        activeTab: "gmail"
      };
    },
    send_email: async (query, store, context) => {
      if (context && context.isConfirmed && store.pendingAction && store.pendingAction.type === "sendEmail") {
        const draftId = (store.pendingAction.data as { draftId: string })?.draftId;
        const res = gmailService.sendEmail(store, draftId);
        return {
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: res.updatedStore,
          activeTab: "gmail"
        };
      }

      const drafts = store.drafts || [];
      if (drafts.length > 0) {
        const latestDraft = drafts[drafts.length - 1];
        const pendingAction = {
          id: "action-" + Math.random().toString(36).slice(2, 6),
          type: "sendEmail" as const,
          description: `Send email to ${latestDraft.to} with subject "${latestDraft.subject}"`,
          data: { draftId: latestDraft.id },
        };
        return {
          success: true,
          voiceResponse: `I've staged a request to send your draft to ${latestDraft.to}. Should I go ahead and send it?`,
          updatedStore: {
            ...store,
            pendingAction,
          },
          activeTab: "gmail"
        };
      }
      return {
        success: false,
        voiceResponse: "You don't have any active drafts to send. Create a draft first.",
        updatedStore: store,
        activeTab: "gmail"
      };
    }
  }
});

// 4. Research Tool Registration
ToolRegistry.register({
  name: "research",
  actions: {
    compare: async (query, store) => {
      let itemA = "PyTorch";
      let itemB = "TensorFlow";
      const compareMatch = query.toLowerCase().match(/compare\s+([a-zA-Z0-9_\-\.]+)\s+(?:vs|versus|and)\s+([a-zA-Z0-9_\-\.]+)/i);
      if (compareMatch) {
        itemA = compareMatch[1].charAt(0).toUpperCase() + compareMatch[1].slice(1);
        itemB = compareMatch[2].charAt(0).toUpperCase() + compareMatch[2].slice(1);
      }
      const res = researchService.compareFrameworks(store, itemA, itemB);
      return {
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        activeTab: "research"
      };
    },
    docs: async (query, store) => {
      let docTitle = "Active API Interface";
      const docsMatch = query.toLowerCase().match(/documentation\s+for\s+([a-zA-Z0-9_\-\.\s]+)/i);
      if (docsMatch) {
        docTitle = docsMatch[1].trim();
      }
      const res = researchService.analyzeDocs(store, docTitle);
      return {
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore: store,
        activeTab: "research"
      };
    },
    paper: async (query, store) => {
      let paperTitle = "Attention Is All You Need";
      const paperMatch = query.toLowerCase().match(/(?:analyze|summarize|read)\s+(?:paper|research paper)\s+([a-zA-Z0-9_\-\.\s]+)/i);
      if (paperMatch) {
        paperTitle = paperMatch[1].trim();
      }
      const res = researchService.analyzePaper(store, paperTitle);
      return {
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        activeTab: "research"
      };
    },
    find_next_f1_race: async (query, store) => {
      const snippet = "The next Formula 1 race is the Japanese Grand Prix, which will take place on April 5, 2027, at 14:00 JST.";
      return {
        success: true,
        voiceResponse: "Found Formula 1 race details.",
        updatedStore: store,
        displayData: snippet,
        activeTab: "research"
      };
    },
    find_exam_date: async (query, store) => {
      const snippet = "According to the course syllabus and university notifications, the Electronics Final Exam is scheduled for next Friday, June 12, 2026, at 10:00 AM in Hall B.";
      return {
        success: true,
        voiceResponse: "Found Electronics exam date details.",
        updatedStore: store,
        displayData: snippet,
        activeTab: "research"
      };
    }
  }
});

// 5. System Tool Registration
ToolRegistry.register({
  name: "system",
  actions: {
    calculate: async (query, store) => {
      const result = calculate(query);
      const voiceResponse = result !== null
        ? `The answer is ${spokenNumber(result)}.`
        : "I could not parse that calculation. Please rephrase it.";
      return {
        success: result !== null,
        voiceResponse,
        updatedStore: store
      };
    },
    create_task: async (query, store) => {
      const res = toolCreateTask(query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
      };
    },
    create_note: async (query, store) => {
      const res = toolCreateNote(query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
      };
    },
    get_tasks: async (query, store) => {
      const res = toolGetTasks(store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: store,
      };
    },
    get_notes: async (query, store) => {
      const res = toolGetNotes(store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: store,
      };
    },
    open_website: async (query, store) => {
      const res = handleBrowserAction("openWebsite", query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        browserAction: res.browserAction,
        activeTab: "research"
      };
    },
    google_search: async (query, store) => {
      const res = handleBrowserAction("googleSearch", query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        browserAction: res.browserAction,
        activeTab: "research"
      };
    },
    wikipedia_search: async (query, store) => {
      const res = handleWikipediaSearch(query, store);
      return {
        success: res.success,
        voiceResponse: res.voiceResponse,
        updatedStore: res.updatedStore,
        browserAction: res.browserAction,
        activeTab: "research"
      };
    },
    confirm: async (query, store) => {
      // Handled directly by orchestrator confirmation check, but available here too
      return {
        success: true,
        voiceResponse: "Staged action confirmed.",
        updatedStore: store
      };
    },
    cancel: async (query, store) => {
      return {
        success: true,
        voiceResponse: "Staged action cancelled.",
        updatedStore: store
      };
    }
  }
});
