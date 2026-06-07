import { type ToolStore, type ToolName, type PendingAction, type CalendarEvent } from "@/lib/tools";
import { gmailService } from "@/services/gmail";
import { calendarService } from "@/services/calendar";
import { youtubeService } from "@/services/youtube";
import { researchService } from "@/services/research";
import { YouTubeSearchTool, YouTubePlayTool } from "@/tools/youtube";

export interface OrchestrationResult {
  tool: ToolName;
  success: boolean;
  voiceResponse: string;
  updatedStore: ToolStore;
  activeTab?: "console" | "gmail" | "calendar" | "research" | "media";
  browserAction?: unknown;
  pendingAction?: unknown;
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
  }

  targetDate.setHours(hour, minute, 0, 0);

  const displayStr = targetDate.toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  return {
    isoString: targetDate.toISOString(),
    displayStr,
  };
}

export const orchestrator = {
  /**
   * Evaluates the query, routes to appropriate agent, executes it, and updates memory/store.
   */
  process(message: string, store: ToolStore): OrchestrationResult | null {
    const m = message.toLowerCase().trim();

    // ─── 0. Confirmation / Approval checks ───
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
          };
        } else if (action.type === "createEvent") {
          const res = calendarService.commitEvent(store, action.data as CalendarEvent);
          return {
            tool: "confirmAction",
            success: true,
            voiceResponse: res.voiceResponse,
            updatedStore: res.updatedStore,
            activeTab: "calendar",
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
        
        // Add to history context
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
        // Extract recipient
        let to = "recipient@example.com";
        const toMatch = m.match(/to\s+([a-zA-Z0-9_\-\.]+)/);
        if (toMatch) {
          to = toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1);
          if (!to.includes("@")) to = `${to}@example.com`;
        } else if (m.includes("murf")) {
          to = "support@murf.ai";
        }

        // Extract subject/body
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
            id: "action-" + Date.now().toString(36),
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
        const voiceResponse = calendarService.generateMorningBriefing(store);
        return {
          tool: "morningBriefing",
          success: true,
          voiceResponse,
          updatedStore: store,
          activeTab: "calendar",
        };
      }

      // 2b. Schedule Event
      if (/\b(schedule|add|create|book|appoint)\b/.test(m)) {
        // Extract title
        let title = "Sync Meeting";
        const titleMatch = cleanTitle(message);
        if (titleMatch) title = titleMatch;

        const { isoString } = parseDateTime(m);
        const res = calendarService.scheduleEvent(store, title, isoString);

        if (res.conflict) {
          // Staging conflict response
          return {
            tool: "conflictCheck",
            success: false,
            voiceResponse: res.voiceResponse,
            updatedStore: store, // no update to store if conflict
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
        const res = calendarService.readCalendar(store, period);
        return {
          tool: "readCalendar",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore: store,
          activeTab: "calendar",
        };
      }
    }

    // ─── 3. Media & Knowledge Agent Classification ───
    const isYoutube = /\b(youtube|yt|video|videos|play|watch|listen|start|search|find|show\s+me|tutorial|tutorials|course|courses|song|songs|bhajan|music|podcast|podcasts|highlights)\b/.test(m);
    if (isYoutube) {
      // 3a. Play Intent
      const isPlay = /\b(play|watch|listen\s+to|listen|start)\b/.test(m);
      if (isPlay) {
        let query = m;
        query = query
          .replace(/^(play\s+on\s+youtube|play\s+youtube|play\s+yt|play|watch\s+on\s+youtube|watch\s+youtube|watch|listen\s+to\s+on\s+youtube|listen\s+to|listen|start\s+on\s+youtube|start)\s+/i, "")
          .replace(/\s+on\s+(youtube|yt)$/i, "")
          .trim();
        if (!query) {
          query = m;
        }

        const res = YouTubePlayTool.execute(query, store);
        const newAction = {
          id: "browser-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          actionType: "youtubePlay" as const,
          target: res.videoUrl || query,
          createdAt: new Date().toISOString(),
        };
        const updatedStore = {
          ...store,
          browserActions: [...(store.browserActions || []), newAction]
        };

        return {
          tool: "youtubePlayMedia",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore,
          activeTab: "media",
          browserAction: res.browserAction,
        };
      }

      // 3b. Search Intent
      const isSearch = /\b(search|find|show\s+me)\b/.test(m);
      if (isSearch) {
        let query = m;
        query = query
          .replace(/^(search\s+youtube\s+for|search\s+youtube|search\s+yt\s+for|search\s+for|search|find\s+videos\s+about|find\s+courses\s+about|find|show\s+me\s+videos\s+about|show\s+me\s+courses\s+about|show\s+me)\s+/i, "")
          .replace(/\s+on\s+(youtube|yt)$/i, "")
          .trim();
        if (!query) {
          query = m;
        }

        const res = YouTubeSearchTool.execute(query, store);
        const newAction = {
          id: "browser-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          actionType: "youtubeSearch" as const,
          target: query,
          createdAt: new Date().toISOString(),
        };
        const updatedStore = {
          ...store,
          browserActions: [...(store.browserActions || []), newAction]
        };

        return {
          tool: "youtubeSearchMedia",
          success: true,
          voiceResponse: res.voiceResponse,
          updatedStore,
          activeTab: "media",
          browserAction: res.browserAction,
        };
      }

      // 3c. YouTube Recommendations
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

      // 3d. Educational Discovery
      if (/\b(educational|explain|explaining|course|courses|learn|study|discover)\b/.test(m)) {
        const query = m.replace(/^(find\s+videos\s+explaining|find\s+courses\s+about|find|explain|discover)\s+/i, "").trim();
        const res = youtubeService.search(query);
        
        // Add interest to memory
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

      // 3e. General YouTube Fallback
      let query = m;
      query = query
        .replace(/^(search\s+youtube\s+for|search\s+youtube|search\s+yt\s+for|search\s+for|search|find\s+videos\s+about|find\s+courses\s+about|find|show\s+me\s+videos\s+about|show\s+me\s+courses\s+about|show\s+me)\s+/i, "")
        .replace(/\s+on\s+(youtube|yt)$/i, "")
        .trim();
      if (!query) {
        query = m;
      }
      const res = YouTubeSearchTool.execute(query, store);
      const newAction = {
        id: "browser-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        actionType: "youtubeSearch" as const,
        target: query,
        createdAt: new Date().toISOString(),
      };
      const updatedStore = {
        ...store,
        browserActions: [...(store.browserActions || []), newAction]
      };
      return {
        tool: "youtubeSearchMedia",
        success: true,
        voiceResponse: res.voiceResponse,
        updatedStore,
        activeTab: "media",
        browserAction: res.browserAction,
      };
    }

    // ─── 4. Research Agent Classification ───
    const isResearch = /\b(research|paper|papers|framework|frameworks|compare|comparison|architecture|documentation|docs|api)\b/.test(m);
    if (isResearch) {
      // 4a. Compare Frameworks
      if (/\b(compare|versus|vs)\b/.test(m)) {
        let itemA = "PyTorch";
        let itemB = "TensorFlow";

        // Parse items from query (e.g. "compare PyTorch vs TensorFlow" or "compare PyTorch and TensorFlow")
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

      // 4b. Documentation Analysis
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

      // 4c. Research Paper Analysis
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
    .replace(/\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d+\s*(?:am|pm|pm)?)\b/gi, "")
    .replace(/\b(at|on|for|tomorrow|today)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  if (title) {
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  return "Sync Sync";
}
