/* ─────────────────────────────────────────────────────────────
   Tool Registry — Voice Agent OS Day 5
   All tools execute locally (no DB). Storage passed in/out.
───────────────────────────────────────────────────────────── */

export type ToolName =
  | "createTask"
  | "createNote"
  | "getTasks"
  | "getNotes"
  | "calculate"
  | "openWebsite"
  | "googleSearch"
  | "youtubeSearch"
  | "youtubePlay"
  | "readInbox"
  | "draftEmail"
  | "sendEmail"
  | "readCalendar"
  | "scheduleEvent"
  | "conflictCheck"
  | "morningBriefing"
  | "youtube.search"
  | "youtube.play"
  | "youtubeSearchMedia"
  | "youtubePlayMedia"
  | "youtubeEducational"
  | "youtubeRecommendations"
  | "researchPaper"
  | "researchDocs"
  | "researchCompare"
  | "confirmAction"
  | "cancelAction"
  | "none";

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // human-readable string e.g. "tomorrow at 7 PM"
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface BrowserAction {
  id: string;
  actionType: "open" | "googleSearch" | "youtubeSearch" | "youtubePlay";
  target: string;
  createdAt: string;
}

export interface GmailEmail {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  priority: "high" | "medium" | "low";
  summary: string;
  body: string;
  date: string;
  unread: boolean;
}

export interface GmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  isReminder?: boolean;
  createdAt: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  summary: string;
  keyContributions: string;
  methodology: string;
  strengths: string;
  weaknesses: string;
  implementationDifficulty: string;
  actionableInsights: string;
  createdAt: string;
}

export interface ResearchComparison {
  id: string;
  title: string;
  items: string[];
  table: { metric: string; values: string[] }[];
  summary: string;
  recommendation: string;
  createdAt: string;
}

export interface PendingAction {
  id: string;
  type: "sendEmail" | "createEvent" | "deleteEvent";
  description: string;
  data: unknown;
}

export interface YouTubeVideoStoreItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnailUrl?: string;
}

export interface ToolStore {
  tasks: Task[];
  notes: Note[];
  browserActions?: BrowserAction[];
  emails?: GmailEmail[];
  drafts?: GmailDraft[];
  calendarEvents?: CalendarEvent[];
  researchPapers?: ResearchPaper[];
  comparisons?: ResearchComparison[];
  pendingAction?: PendingAction | null;
  learningInterests?: string[];
  researchHistory?: string[];
  youtubeSearchResults?: YouTubeVideoStoreItem[];
}

export interface ToolResult {
  tool: ToolName;
  success: boolean;
  voiceResponse: string; // spoken to user via Murf
  displayData?: unknown; // optional data for UI
}

/* ─── Tiny ID generator (server-safe) ───────────────────────── */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ─── Calculator ─────────────────────────────────────────────── */
// Handles: percentages, basic arithmetic
// Returns null if the expression can't be safely evaluated
export function calculate(expression: string): number | null {
  try {
    // Normalise percent patterns: "15 percent of 240" → "0.15 * 240"
    const expr = expression
      .toLowerCase()
      .replace(/(\d+(?:\.\d+)?)\s*percent\s+of\s+(\d+(?:\.\d+)?)/g, "($1/100)*$2")
      .replace(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)/g, "($1/100)*$2")
      .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")
      .replace(/x/g, "*")
      .replace(/÷/g, "/")
      .replace(/[^0-9+\-*/().\s]/g, "");

    if (!expr.trim()) {
      return null;
    }

    // Safe eval via Function — only numeric expression allowed
    const result = new Function(`"use strict"; return (${expr})`)() as number;
    if (typeof result !== "number" || !isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

/* ─── Format a number for speech ────────────────────────────── */
export function spokenNumber(n: number): string {
  // Round to 4 decimal places max, strip trailing zeros
  const rounded = parseFloat(n.toFixed(4));
  return rounded.toLocaleString("en-US");
}

/* ─── Tool: createTask ───────────────────────────────────────── */
export function toolCreateTask(
  message: string,
  store: ToolStore
): ToolResult & { updatedStore: ToolStore } {
  // Strip trigger phrases to get the task content
  const title =
    message
      .replace(
        /^(create|add|make|set|schedule)\s+(a\s+)?(task|reminder|to-do|todo)\s*(to\s+|for\s+)?/i,
        ""
      )
      .replace(/^(remind me to|remember to)\s+/i, "")
      .trim() || message.trim();

  // Extract due date phrases
  const dueDateMatch = title.match(
    /(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|at \d+\s*(?:am|pm)|on \w+)/i
  );
  const dueDate = dueDateMatch ? dueDateMatch[0] : undefined;

  const task: Task = {
    id: uid(),
    title: title.charAt(0).toUpperCase() + title.slice(1),
    dueDate,
    createdAt: new Date().toISOString(),
  };

  const updatedStore: ToolStore = {
    ...store,
    tasks: [...store.tasks, task],
  };

  const duePart = dueDate ? ` due ${dueDate}` : "";
  return {
    tool: "createTask",
    success: true,
    voiceResponse: `Task created: ${task.title}${duePart}.`,
    displayData: task,
    updatedStore,
  };
}

/* ─── Tool: createNote ───────────────────────────────────────── */
export function toolCreateNote(
  message: string,
  store: ToolStore
): ToolResult & { updatedStore: ToolStore } {
  const content =
    message
      .replace(/^(remember|note|save|capture|write down|keep note)\s*(that\s+|this\s+)?/i, "")
      .trim() || message.trim();

  const note: Note = {
    id: uid(),
    content: content.charAt(0).toUpperCase() + content.slice(1),
    createdAt: new Date().toISOString(),
  };

  const updatedStore: ToolStore = {
    ...store,
    notes: [...store.notes, note],
  };

  return {
    tool: "createNote",
    success: true,
    voiceResponse: `I saved that note: ${note.content}.`,
    displayData: note,
    updatedStore,
  };
}

/* ─── Tool: getTasks ─────────────────────────────────────────── */
export function toolGetTasks(store: ToolStore): ToolResult {
  const { tasks } = store;

  if (tasks.length === 0) {
    return {
      tool: "getTasks",
      success: true,
      voiceResponse: "You have no tasks at the moment.",
      displayData: [],
    };
  }

  const count = tasks.length;
  const label = count === 1 ? "task" : "tasks";

  // Speak up to 3 tasks by name
  const spoken = tasks
    .slice(-3)
    .map((t) => t.title)
    .join(", ");

  const more = count > 3 ? ` and ${count - 3} more` : "";

  return {
    tool: "getTasks",
    success: true,
    voiceResponse: `You have ${count} ${label}: ${spoken}${more}.`,
    displayData: tasks,
  };
}

/* ─── Tool: getNotes ─────────────────────────────────────────── */
export function toolGetNotes(store: ToolStore): ToolResult {
  const { notes } = store;

  if (notes.length === 0) {
    return {
      tool: "getNotes",
      success: true,
      voiceResponse: "You have no saved notes.",
      displayData: [],
    };
  }

  const count = notes.length;
  const label = count === 1 ? "note" : "notes";
  const last = notes[notes.length - 1];

  return {
    tool: "getNotes",
    success: true,
    voiceResponse: `You have ${count} ${label}. Your most recent note says: ${last.content}.`,
    displayData: notes,
  };
}

/* ─── Intent detector ────────────────────────────────────────── */
// Runs BEFORE hitting the LLM — pattern match on the raw user message.
// Returns the tool to invoke, or "none" to fall through to normal AI.

export function detectIntent(message: string): ToolName {
  const m = message.toLowerCase().trim();

  // --- Calculate ---
  if (
    /\d/.test(m) &&
    (/\d+\s*[\+\-\*\/x÷]\s*\d/.test(m) ||
      /\d+\s*(percent|%)\s+of\s+\d/.test(m) ||
      /what.{0,15}(is|are|equals?)\s+[\d\s\+\-\*\/x÷%()]+/.test(m) ||
      /calculate|compute|how much is\s+[\d]/.test(m))
  ) {
    return "calculate";
  }

  // --- Get tasks ---
  if (
    /(what|show|list|tell me|do i have|any)\s.*(task|to.?do|reminder|scheduled)/.test(m) ||
    /my tasks/.test(m)
  ) {
    return "getTasks";
  }

  // --- Get notes ---
  if (
    /(what|show|list|tell me|do i have|any)\s.*(note|notes|saved|wrote)/.test(m) ||
    /my notes/.test(m)
  ) {
    return "getNotes";
  }

  // --- Create task ---
  if (
    /(create|add|make|set|schedule)\s+(a\s+)?(task|reminder|to.?do)/.test(m) ||
    /remind me to/.test(m) ||
    /add .{3,} to (my )?(task|to.?do|list)/.test(m)
  ) {
    return "createTask";
  }

  // --- Create note ---
  if (
    /(remember|note|save|capture|write down|keep note)\s+that/.test(m) ||
    /^(note|remember):\s/.test(m) ||
    /save (a |this |that )?(note|reminder|thought)/.test(m)
  ) {
    return "createNote";
  }

  return "none";
}
