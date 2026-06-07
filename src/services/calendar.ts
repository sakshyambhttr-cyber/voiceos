import { type ToolStore, type CalendarEvent, type PendingAction } from "@/lib/tools";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Formats a Date object to a readable string (e.g. "1:00 PM")
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Checks if two events overlap
function isOverlapping(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1 < e2 && e1 > s2;
}

export const calendarService = {
  /**
   * Reads calendar events for a specific day or week
   */
  readCalendar(store: ToolStore, period: "today" | "week" = "today") {
    const events = store.calendarEvents || [];
    const now = new Date("2026-06-07T11:03:48+05:45"); // Simulate active session current date
    const startOfPeriod = new Date(now);
    startOfPeriod.setHours(0, 0, 0, 0);
    
    const endOfPeriod = new Date(startOfPeriod);
    if (period === "today") {
      endOfPeriod.setDate(endOfPeriod.getDate() + 1);
    } else {
      endOfPeriod.setDate(endOfPeriod.getDate() + 7);
    }

    const filtered = events.filter(e => {
      const eStart = new Date(e.startTime);
      return eStart >= startOfPeriod && eStart < endOfPeriod;
    });

    if (filtered.length === 0) {
      return {
        success: true,
        voiceResponse: `You have no meetings scheduled for ${period === "today" ? "today" : "this week"}.`,
        events: filtered,
      };
    }

    const eventStrings = filtered.map(e => `${e.title} at ${formatTime(new Date(e.startTime))}`).join(". ");
    const voiceResponse = `For ${period === "today" ? "today" : "this week"}, you have: ${eventStrings}.`;

    return {
      success: true,
      voiceResponse,
      events: filtered,
    };
  },

  /**
   * Schedules an event, checking for conflicts first.
   */
  scheduleEvent(store: ToolStore, title: string, startTimeIso: string, durationMinutes = 60) {
    const events = store.calendarEvents || [];
    const newStart = new Date(startTimeIso);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    // Conflict detection
    let conflictEvent: CalendarEvent | null = null;
    for (const e of events) {
      const eStart = new Date(e.startTime);
      const eEnd = new Date(e.endTime);
      if (isOverlapping(newStart, newEnd, eStart, eEnd)) {
        conflictEvent = e;
        break;
      }
    }

    if (conflictEvent) {
      // Suggest alternative: immediately after the conflicting event
      const conflictEnd = new Date(conflictEvent.endTime);
      const altStartStr = conflictEnd.toISOString();
      const altTimeStr = formatTime(conflictEnd);

      const voiceResponse = `Conflict detected with your "${conflictEvent.title}" at ${formatTime(new Date(conflictEvent.startTime))}. Would you like me to schedule it at ${altTimeStr} instead?`;

      return {
        success: false,
        conflict: true,
        voiceResponse,
        conflictEvent,
        suggestedStart: altStartStr,
        suggestedDuration: durationMinutes,
      };
    }

    // No conflict, stage pendingAction
    const newEvent: CalendarEvent = {
      id: "event-" + uid(),
      title,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const dateStr = newStart.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const timeStr = formatTime(newStart);
    const voiceResponse = `I've prepared to schedule "${title}" on ${dateStr} at ${timeStr}. Should I add it to your calendar?`;

    const pendingAction: PendingAction = {
      id: "action-" + uid(),
      type: "createEvent",
      description: `Schedule "${title}" for ${dateStr} at ${timeStr}`,
      data: newEvent,
    };

    return {
      success: true,
      conflict: false,
      voiceResponse,
      pendingAction,
      updatedStore: {
        ...store,
        pendingAction,
      },
    };
  },

  /**
   * Commits the event to the calendar after confirmation.
   */
  commitEvent(store: ToolStore, event: CalendarEvent) {
    const updatedStore: ToolStore = {
      ...store,
      calendarEvents: [...(store.calendarEvents || []), event],
      pendingAction: null,
    };

    return {
      success: true,
      voiceResponse: `Successfully added "${event.title}" to your calendar.`,
      updatedStore,
    };
  },

  /**
   * Compiles the Morning Briefing including meetings, tasks, and deadlines.
   */
  generateMorningBriefing(store: ToolStore) {
    const events = store.calendarEvents || [];
    const tasks = store.tasks || [];
    
    // Filter events for today (June 7, 2026)
    const now = new Date("2026-06-07T11:03:48+05:45");
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const todayEvents = events.filter(e => {
      const eStart = new Date(e.startTime);
      return eStart >= startOfToday && eStart < endOfToday;
    });

    const pendingTasks = tasks.slice(0, 2);

    let briefing = "Welcome back. ";
    if (todayEvents.length > 0) {
      const eventList = todayEvents.map(e => `"${e.title}" at ${formatTime(new Date(e.startTime))}`).join(", ");
      briefing += `You have ${todayEvents.length} events scheduled today: ${eventList}. `;
    } else {
      briefing += "You have a clear schedule today. ";
    }

    if (pendingTasks.length > 0) {
      const taskList = pendingTasks.map(t => `"${t.title}"`).join(" and ");
      briefing += `Your top tasks are ${taskList}.`;
    } else {
      briefing += "No pending tasks listed.";
    }

    return briefing;
  }
};
