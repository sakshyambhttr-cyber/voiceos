import type { CalendarProvider, CalendarEventSchema } from "../types";

let inMemoryEvents: CalendarEventSchema[] = [
  {
    id: "cal-1",
    title: "Electronics Lecture - Chapters 7 & 8",
    description: "Studying op-amps and filter designs.",
    startTime: "2026-06-07T13:00:00.000Z",
    endTime: "2026-06-07T14:30:00.000Z",
    calendarType: "Study"
  },
  {
    id: "cal-2",
    title: "Study Group - NumPy Exercises",
    description: "Solve array manipulation exercises with classmates.",
    startTime: "2026-06-08T14:00:00.000Z",
    endTime: "2026-06-08T15:30:00.000Z",
    calendarType: "Study"
  },
  {
    id: "cal-3",
    title: "SaaS Launch Sync",
    description: "Align on MVP launch roadmap features.",
    startTime: "2026-06-09T10:00:00.000Z",
    endTime: "2026-06-09T11:00:00.000Z",
    calendarType: "Work"
  }
];

export const MockCalendarProvider: CalendarProvider = {
  name: "Mock Calendar",

  async createEvent(event: CalendarEventSchema): Promise<CalendarEventSchema> {
    const newEvent = {
      ...event,
      id: "event-" + Math.random().toString(36).slice(2, 9),
    };
    inMemoryEvents.push(newEvent);
    return newEvent;
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEventSchema>): Promise<CalendarEventSchema> {
    const idx = inMemoryEvents.findIndex(e => e.id === eventId);
    if (idx === -1) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    const updated = {
      ...inMemoryEvents[idx],
      ...updates,
    };
    inMemoryEvents[idx] = updated;
    return updated;
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const initialLen = inMemoryEvents.length;
    inMemoryEvents = inMemoryEvents.filter(e => e.id !== eventId);
    return inMemoryEvents.length < initialLen;
  },

  async listEvents(start: string, end: string): Promise<CalendarEventSchema[]> {
    const sTime = new Date(start).getTime();
    const eTime = new Date(end).getTime();
    return inMemoryEvents.filter(e => {
      const t = new Date(e.startTime).getTime();
      return t >= sTime && t <= eTime;
    });
  },

  async getUpcomingEvents(maxResults = 5): Promise<CalendarEventSchema[]> {
    const now = new Date("2026-06-07T11:03:48+05:45").getTime();
    return inMemoryEvents
      .filter(e => new Date(e.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, maxResults);
  }
};
