/**
 * Intent Detection for Browser Action Layer
 * Detects browser intents and extracts clean queries or site names without LLM latency.
 */

export type BrowserActionType = "openWebsite" | "googleSearch" | "youtubeSearch" | "youtubePlay";

/**
 * Checks if the message matches a browser action intent.
 * Returns the intent type or "none" if it should fall through.
 */
export function detectBrowserIntent(message: string): BrowserActionType | "none" {
  const m = message.toLowerCase().trim();

  // 1. Open Website Intent
  if (m.startsWith("open ") || m.startsWith("go to ")) {
    return "openWebsite";
  }

  // 2. YouTube Search Intent
  // e.g. "search youtube for python tutorials", "youtube search python", "search python tutorials on youtube"
  const isYoutubeSearch =
    (m.includes("youtube") || m.includes("yt")) &&
    (m.includes("search") || m.includes("find") || m.includes("look up"));
  
  const startsWithYoutube = m.startsWith("youtube ") || m.startsWith("yt ");

  if (isYoutubeSearch || startsWithYoutube) {
    return "youtubeSearch";
  }

  // 3. YouTube Play Intent
  // e.g. "play believer", "play krishna bhajan", "play believer by imagine dragons on youtube"
  if (m.startsWith("play ") || m.includes("play ")) {
    return "youtubePlay";
  }

  // 4. Google Search Intent
  // e.g. "search ai news", "google search nepal stock market", "google nepal stock market"
  if (
    m.startsWith("search ") ||
    m.startsWith("google ") ||
    m.startsWith("google search ") ||
    m.startsWith("find ") ||
    m.startsWith("look up ")
  ) {
    return "googleSearch";
  }

  return "none";
}

/**
 * Clean up trigger phrases and extract the core query or target.
 */
export function extractBrowserTarget(intent: BrowserActionType, message: string): string {
  let clean = message.trim();
  const m = clean.toLowerCase();

  switch (intent) {
    case "openWebsite":
      // Remove "open " or "go to " prefix
      if (m.startsWith("open ")) {
        clean = clean.slice(5).trim();
      } else if (m.startsWith("go to ")) {
        clean = clean.slice(6).trim();
      }
      break;

    case "youtubeSearch":
      // Remove prefixes like "search youtube for ", "youtube search ", "search ", "youtube ", etc.
      clean = clean
        .replace(/^(search\s+youtube\s+for|search\s+yt\s+for|youtube\s+search|yt\s+search|youtube|yt|search|find|look\s+up)\s+/i, "")
        // Also remove suffixes like " on youtube", " on yt"
        .replace(/\s+on\s+(youtube|yt)$/i, "")
        .trim();
      break;

    case "youtubePlay":
      // Remove "play " prefix and " on youtube" or " on yt" suffix
      clean = clean
        .replace(/^play\s+/i, "")
        .replace(/\s+on\s+(youtube|yt)$/i, "")
        .trim();
      break;

    case "googleSearch":
      // Remove prefixes like "google search ", "google ", "search google for ", "search for ", "search ", "find ", "look up "
      clean = clean
        .replace(/^(google\s+search|google|search\s+google\s+for|search\s+for|search|find|look\s+up)\s+/i, "")
        // Remove suffix like " on google"
        .replace(/\s+on\s+google$/i, "")
        .trim();
      break;
  }

  return clean || message.trim();
}
