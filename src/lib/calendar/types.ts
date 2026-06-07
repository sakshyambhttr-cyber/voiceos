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

export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface CalendarProvider {
  name: "Google Calendar" | "Mock Calendar" | "Outlook" | "Apple";
  createEvent(event: CalendarEventSchema, tokens?: CalendarTokens): Promise<CalendarEventSchema>;
  updateEvent(eventId: string, updates: Partial<CalendarEventSchema>, tokens?: CalendarTokens): Promise<CalendarEventSchema>;
  deleteEvent(eventId: string, tokens?: CalendarTokens): Promise<boolean>;
  listEvents(start: string, end: string, tokens?: CalendarTokens): Promise<CalendarEventSchema[]>;
  getUpcomingEvents(maxResults?: number, tokens?: CalendarTokens): Promise<CalendarEventSchema[]>;
}
