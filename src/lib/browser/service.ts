/**
 * Browser Tool Service for Voice OS
 * Exposes browser-safe client-side APIs for opening pages and searching.
 */

// Helper to sanitize URLs (prevents javascript: or data: and adds protocol if needed)
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(javascript|data):/i.test(trimmed)) {
    return "about:blank";
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

// Helper to sanitize search queries
export function sanitizeQuery(query: string): string {
  return query
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // strip control characters
    .trim();
}

// Browser API
export const browser = {
  open(url: string): void {
    if (typeof window === "undefined") return;
    const cleanUrl = sanitizeUrl(url);
    window.open(cleanUrl, "_blank", "noopener,noreferrer");
  },
};

// Google API
export const google = {
  search(query: string): void {
    if (typeof window === "undefined") return;
    const cleanQuery = sanitizeQuery(query);
    const url = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },
};

// YouTube API
export const youtube = {
  search(query: string): void {
    if (typeof window === "undefined") return;
    const cleanQuery = sanitizeQuery(query);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },
  play(query: string): void {
    if (typeof window === "undefined") return;
    const cleanQuery = sanitizeQuery(query);
    if (/^https?:\/\//i.test(cleanQuery)) {
      browser.open(cleanQuery);
    } else {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  },
};

export interface BrowserActionPayload {
  actionType: "open" | "googleSearch" | "youtubeSearch" | "youtubePlay";
  target: string;
}

// Client-side dispatcher to execute a browser action payload
export function executeBrowserAction(action: BrowserActionPayload): void {
  const { actionType, target } = action;
  switch (actionType) {
    case "open":
      browser.open(target);
      break;
    case "googleSearch":
      google.search(target);
      break;
    case "youtubeSearch":
      youtube.search(target);
      break;
    case "youtubePlay":
      youtube.play(target);
      break;
    default:
      console.warn("Unknown browser action type:", actionType);
  }
}
