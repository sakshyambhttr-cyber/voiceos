export interface CalendarEventSchema {
  id?: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone?: string;
  location?: string;
  reminders?: string[];
  calendarType?: "Personal" | "Work" | "Study";
}

export interface CalendarProvider {
  name: "Google Calendar" | "Mock Calendar" | "Outlook" | "Apple";
  createEvent(event: CalendarEventSchema, tokens?: any): Promise<CalendarEventSchema>;
  updateEvent(eventId: string, updates: Partial<CalendarEventSchema>, tokens?: any): Promise<CalendarEventSchema>;
  deleteEvent(eventId: string, tokens?: any): Promise<boolean>;
  listEvents(start: string, end: string, tokens?: any): Promise<CalendarEventSchema[]>;
  getUpcomingEvents(maxResults?: number, tokens?: any): Promise<CalendarEventSchema[]>;
}
