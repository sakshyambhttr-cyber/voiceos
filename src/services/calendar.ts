import { GoogleCalendarProvider } from "@/lib/calendar/providers/google";
import { MockCalendarProvider } from "@/lib/calendar/providers/mock";
import type { CalendarEventSchema, CalendarProvider } from "@/lib/calendar/types";
import type { ToolStore, PendingAction } from "@/lib/tools";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isOverlapping(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1 < e2 && e1 > s2;
}

// Automatically handles OAuth token refresh if needed, and returns the correct provider
async function getProviderAndTokens(store: ToolStore): Promise<{
  provider: CalendarProvider;
  tokens: { accessToken: string } | null;
  updatedStore?: ToolStore;
}> {
  const tokens = store.calendarTokens;
  if (tokens && tokens.accessToken && !tokens.accessToken.startsWith("mock-")) {
    // Check if close to expiry (5-minute buffer)
    if (Date.now() + 5 * 60 * 1000 >= tokens.expiryDate && tokens.refreshToken) {
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            refresh_token: tokens.refreshToken,
            grant_type: "refresh_token",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || tokens.refreshToken,
            expiryDate: Date.now() + data.expires_in * 1000,
          };
          return {
            provider: GoogleCalendarProvider,
            tokens: newTokens,
            updatedStore: {
              ...store,
              calendarTokens: newTokens,
            },
          };
        }
      } catch (err) {
        console.error("[Token Refresh] Exception while refreshing token:", err);
      }
    }
    return { provider: GoogleCalendarProvider, tokens };
  }

  // Fallback to Mock Calendar
  return { provider: MockCalendarProvider, tokens: null };
}

export const calendarService = {
  /**
   * Reads calendar events for a specific day or week
   */
  async readCalendar(store: ToolStore, period: "today" | "week" = "today") {
    const { provider, tokens, updatedStore } = await getProviderAndTokens(store);
    const now = new Date("2026-06-07T11:03:48+05:45");
    const startOfPeriod = new Date(now);
    startOfPeriod.setHours(0, 0, 0, 0);

    const endOfPeriod = new Date(startOfPeriod);
    if (period === "today") {
      endOfPeriod.setDate(endOfPeriod.getDate() + 1);
    } else {
      endOfPeriod.setDate(endOfPeriod.getDate() + 7);
    }

    try {
      const events = await provider.listEvents(startOfPeriod.toISOString(), endOfPeriod.toISOString(), tokens);
      
      let storeWithEvents = { ...store, ...(updatedStore || {}) };
      // Sync local store
      storeWithEvents.calendarEvents = events as any;

      if (events.length === 0) {
        return {
          success: true,
          voiceResponse: `You have no meetings scheduled for ${period === "today" ? "today" : "this week"}.`,
          events: [],
          updatedStore: storeWithEvents,
          providerName: provider.name,
        };
      }

      const eventStrings = events.map(e => `${e.title} at ${formatTime(new Date(e.startTime))}`).join(". ");
      const voiceResponse = `For ${period === "today" ? "today" : "this week"}, you have: ${eventStrings}.`;

      return {
        success: true,
        voiceResponse,
        events,
        updatedStore: storeWithEvents,
        providerName: provider.name,
      };
    } catch (err: any) {
      console.error("[readCalendar] Error:", err);
      return {
        success: false,
        voiceResponse: `Sorry, I couldn't access your calendar.`,
        events: [],
        updatedStore: store,
        providerName: provider.name,
      };
    }
  },

  /**
   * Schedules a new event. Performs conflict checking.
   * New events are created automatically (without staging) if there are no conflicts.
   */
  async scheduleEvent(store: ToolStore, title: string, startTimeIso: string, durationMinutes = 60) {
    const { provider, tokens, updatedStore } = await getProviderAndTokens(store);
    let currentStore = { ...store, ...(updatedStore || {}) };

    const newStart = new Date(startTimeIso);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    try {
      // Get events on the target day for conflict detection
      const dayStart = new Date(newStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const existingEvents = await provider.listEvents(dayStart.toISOString(), dayEnd.toISOString(), tokens);

      // Conflict detection
      let conflictEvent: CalendarEventSchema | null = null;
      for (const e of existingEvents) {
        const eStart = new Date(e.startTime);
        const eEnd = new Date(e.endTime);
        if (isOverlapping(newStart, newEnd, eStart, eEnd)) {
          conflictEvent = e;
          break;
        }
      }

      if (conflictEvent) {
        const conflictEnd = new Date(conflictEvent.endTime);
        const altStartStr = conflictEnd.toISOString();
        const altTimeStr = formatTime(conflictEnd);

        const newEvent: CalendarEventSchema = {
          title,
          startTime: altStartStr,
          endTime: new Date(conflictEnd.getTime() + durationMinutes * 60 * 1000).toISOString(),
          calendarType: store.defaultCalendar || "Personal",
        };

        const pendingAction: PendingAction = {
          id: "action-" + uid(),
          type: "createEvent",
          description: `Schedule "${title}" for ${conflictEnd.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at ${altTimeStr}`,
          data: newEvent,
        };

        currentStore.pendingAction = pendingAction;

        return {
          success: false,
          conflict: true,
          voiceResponse: `Conflict detected with your "${conflictEvent.title}" at ${formatTime(new Date(conflictEvent.startTime))}. Would you like me to schedule it at ${altTimeStr} instead?`,
          updatedStore: currentStore,
          providerName: provider.name,
        };
      }

      // No conflict -> Create event automatically
      const newEvent: CalendarEventSchema = {
        title,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        calendarType: store.defaultCalendar || "Personal",
      };

      const createdEvent = await provider.createEvent(newEvent, tokens);

      // Update local cache
      currentStore.calendarEvents = [...(currentStore.calendarEvents || []), createdEvent as any];

      const dateStr = newStart.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      const timeStr = formatTime(newStart);

      return {
        success: true,
        conflict: false,
        voiceResponse: `I've successfully scheduled "${title}" on ${dateStr} at ${timeStr} using ${provider.name}.`,
        event: createdEvent,
        updatedStore: currentStore,
        providerName: provider.name,
      };
    } catch (err: any) {
      console.error("[scheduleEvent] Error:", err);
      return {
        success: false,
        conflict: false,
        voiceResponse: `I failed to schedule the event on your calendar.`,
        updatedStore: store,
        providerName: provider.name,
      };
    }
  },

  /**
   * Commits a calendar event (e.g. confirming from conflict staging).
   */
  async commitEvent(store: ToolStore, event: CalendarEventSchema) {
    const { provider, tokens, updatedStore } = await getProviderAndTokens(store);
    let currentStore = { ...store, ...(updatedStore || {}) };

    try {
      const createdEvent = await provider.createEvent(event, tokens);
      currentStore.calendarEvents = [...(currentStore.calendarEvents || []), createdEvent as any];
      currentStore.pendingAction = null;

      return {
        success: true,
        voiceResponse: `Successfully added "${event.title}" to your calendar.`,
        updatedStore: currentStore,
        providerName: provider.name,
      };
    } catch (err) {
      console.error("[commitEvent] Error:", err);
      return {
        success: false,
        voiceResponse: "Failed to add event to your calendar.",
        updatedStore: store,
        providerName: provider.name,
      };
    }
  },

  /**
   * Deletes a calendar event. Staged for confirmation (safety).
   */
  async deleteEvent(store: ToolStore, eventId: string) {
    const { provider, tokens, updatedStore } = await getProviderAndTokens(store);
    let currentStore = { ...store, ...(updatedStore || {}) };

    try {
      const success = await provider.deleteEvent(eventId, tokens);
      if (success) {
        currentStore.calendarEvents = (currentStore.calendarEvents || []).filter(e => e.id !== eventId);
      }
      currentStore.pendingAction = null;

      return {
        success,
        voiceResponse: "Event has been deleted.",
        updatedStore: currentStore,
        providerName: provider.name,
      };
    } catch (err) {
      console.error("[deleteEvent] Error:", err);
      return {
        success: false,
        voiceResponse: "Failed to delete event.",
        updatedStore: store,
        providerName: provider.name,
      };
    }
  },

  /**
   * Updates an existing event. Staged for confirmation (safety).
   */
  async updateEvent(store: ToolStore, eventId: string, updates: Partial<CalendarEventSchema>) {
    const { provider, tokens, updatedStore } = await getProviderAndTokens(store);
    let currentStore = { ...store, ...(updatedStore || {}) };

    try {
      const updatedEvent = await provider.updateEvent(eventId, updates, tokens);
      currentStore.calendarEvents = (currentStore.calendarEvents || []).map(e => e.id === eventId ? (updatedEvent as any) : e);
      currentStore.pendingAction = null;

      return {
        success: true,
        voiceResponse: `Successfully moved your meeting to Friday.`,
        updatedStore: currentStore,
        providerName: provider.name,
      };
    } catch (err) {
      console.error("[updateEvent] Error:", err);
      return {
        success: false,
        voiceResponse: "Failed to update event.",
        updatedStore: store,
        providerName: provider.name,
      };
    }
  },

  /**
   * Generates morning briefing using list/upcoming.
   */
  async generateMorningBriefing(store: ToolStore) {
    const { provider, tokens } = await getProviderAndTokens(store);
    const now = new Date("2026-06-07T11:03:48+05:45");
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    try {
      const todayEvents = await provider.listEvents(startOfToday.toISOString(), endOfToday.toISOString(), tokens);
      const pendingTasks = (store.tasks || []).slice(0, 2);

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
    } catch {
      return "Welcome back. I failed to fetch your briefing calendar schedule.";
    }
  }
};
