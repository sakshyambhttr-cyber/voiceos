/**
 * Action Router for Browser Action Layer
 * Coordinates intent resolution, sanitization, state update, and confirmation construction.
 */

import { type ToolStore, type ToolName, type BrowserAction } from "../tools";
import { type BrowserActionType, extractBrowserTarget } from "./intent";

export interface BrowserActionResult {
  tool: ToolName;
  success: boolean;
  voiceResponse: string;
  browserAction: {
    actionType: "open" | "googleSearch" | "youtubeSearch" | "youtubePlay";
    target: string;
  };
  updatedStore: ToolStore;
}

const POPULAR_SITES: Record<string, string> = {
  youtube: "https://www.youtube.com",
  gmail: "https://mail.google.com",
  chatgpt: "https://chatgpt.com",
  google: "https://www.google.com",
  github: "https://github.com",
  facebook: "https://www.facebook.com",
  twitter: "https://x.com",
  x: "https://x.com",
  wikipedia: "https://www.wikipedia.org",
  reddit: "https://www.reddit.com",
  linkedin: "https://www.linkedin.com",
  amazon: "https://www.amazon.com",
  netflix: "https://www.netflix.com",
};

// Generates a simple server-safe unique ID
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Routes and handles browser actions.
 */
export function handleBrowserAction(
  intent: BrowserActionType,
  message: string,
  store: ToolStore
): BrowserActionResult {
  const target = extractBrowserTarget(intent, message);
  let tool: ToolName = "none";
  let voiceResponse = "";
  let actionType: "open" | "googleSearch" | "youtubeSearch" | "youtubePlay" = "open";
  let finalTarget = target;

  switch (intent) {
    case "openWebsite": {
      tool = "openWebsite";
      actionType = "open";
      
      const cleanTarget = target.toLowerCase().replace(/\s+/g, "");
      
      // Determine final URL
      if (POPULAR_SITES[cleanTarget]) {
        finalTarget = POPULAR_SITES[cleanTarget];
      } else if (cleanTarget.includes(".")) {
        // If it looks like a domain, ensure it has a protocol (done at service execution)
        finalTarget = cleanTarget;
      } else {
        // Fallback: try www.[site].com
        finalTarget = `www.${cleanTarget}.com`;
      }

      // Voice response confirmation
      voiceResponse = `I've opened ${target.charAt(0).toUpperCase() + target.slice(1)}.`;
      break;
    }

    case "googleSearch": {
      tool = "googleSearch";
      actionType = "googleSearch";
      voiceResponse = `Searching Google for ${target}.`;
      break;
    }

    case "youtubeSearch": {
      tool = "youtubeSearch";
      actionType = "youtubeSearch";
      voiceResponse = `Searching YouTube for ${target}.`;
      break;
    }

    case "youtubePlay": {
      tool = "youtubePlay";
      actionType = "youtubePlay";
      voiceResponse = `Playing ${target} on YouTube.`;
      break;
    }
  }

  // Create the browser action log entry
  const newAction: BrowserAction = {
    id: uid(),
    actionType,
    target: target,
    createdAt: new Date().toISOString(),
  };

  // Add the log entry to store.browserActions
  const updatedBrowserActions = Array.isArray(store.browserActions)
    ? [...store.browserActions, newAction]
    : [newAction];

  const updatedStore: ToolStore = {
    ...store,
    browserActions: updatedBrowserActions,
  };

  return {
    tool,
    success: true,
    voiceResponse,
    browserAction: {
      actionType,
      target: finalTarget,
    },
    updatedStore,
  };
}
