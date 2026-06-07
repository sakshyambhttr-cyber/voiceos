import type { CalendarProvider, CalendarEventSchema } from "../types";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
}

function mapGoogleEventToSchema(event: GoogleCalendarEvent): CalendarEventSchema {
  return {
    id: event.id,
    title: event.summary || "Untitled Event",
    description: event.description || "",
    startTime: event.start?.dateTime || event.start?.date || "",
    endTime: event.end?.dateTime || event.end?.date || "",
    timezone: event.start?.timeZone || "",
    location: event.location || "",
  };
}

export const GoogleCalendarProvider: CalendarProvider = {
  name: "Google Calendar",

  async createEvent(event: CalendarEventSchema, tokens: { accessToken: string }): Promise<CalendarEventSchema> {
    if (!tokens?.accessToken) throw new Error("No Google Calendar access token available.");

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
        location: event.location,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API Error (create): ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return mapGoogleEventToSchema(data);
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEventSchema>, tokens: { accessToken: string }): Promise<CalendarEventSchema> {
    if (!tokens?.accessToken) throw new Error("No Google Calendar access token available.");

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: updates.title,
        description: updates.description,
        start: updates.startTime ? { dateTime: updates.startTime } : undefined,
        end: updates.endTime ? { dateTime: updates.endTime } : undefined,
        location: updates.location,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API Error (update): ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return mapGoogleEventToSchema(data);
  },

  async deleteEvent(eventId: string, tokens: { accessToken: string }): Promise<boolean> {
    if (!tokens?.accessToken) throw new Error("No Google Calendar access token available.");

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Google Calendar API Error (delete): ${res.status} - ${errText}`);
    }

    return res.status === 204 || res.status === 404;
  },

  async listEvents(start: string, end: string, tokens: { accessToken: string }): Promise<CalendarEventSchema[]> {
    if (!tokens?.accessToken) throw new Error("No Google Calendar access token available.");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API Error (list): ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return (data.items || []).map(mapGoogleEventToSchema);
  },

  async getUpcomingEvents(maxResults = 5, tokens: { accessToken: string }): Promise<CalendarEventSchema[]> {
    if (!tokens?.accessToken) throw new Error("No Google Calendar access token available.");

    const now = new Date("2026-06-07T11:03:48+05:45").toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API Error (upcoming): ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return (data.items || []).map(mapGoogleEventToSchema);
  }
};
