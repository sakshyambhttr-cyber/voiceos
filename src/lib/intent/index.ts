/**
 * Intent Extraction Engine — Voice OS Action Intelligence Layer v2
 *
 * Parses every user command into a structured intent object BEFORE any tool
 * execution. This is the single source of truth for routing decisions.
 *
 * Output shape:
 *   { platform, action, entity, modifiers, raw }
 */

export type IntentPlatform = "youtube" | "google" | "wikipedia" | "system" | null;
export type IntentAction = "search" | "play" | "open" | "none";

export interface ParsedIntent {
  platform: IntentPlatform;
  action: IntentAction;
  entity: string;      // cleaned query — no routing words
  modifiers: string[]; // e.g. ["official", "music video"]
  raw: string;         // original input for debug
}

/* ─── Routing-word removal ──────────────────────────────────────
   These are ONLY stripped from the beginning of the string (prefix
   removal) unless they form a composite with a platform name.
   Words that appear in titles ("play", "watch") are left alone mid-string.
─────────────────────────────────────────────────────────────── */

// Ordered longest-first to avoid partial matches
const COMPOSITE_PREFIXES: RegExp[] = [
  // Change and search/move commands
  /^change\s+the\s+video\s+and\s+move\s+to\s+search\s+for\s+/i,
  /^change\s+the\s+video\s+and\s+move\s+to\s+search\s+/i,
  /^change\s+the\s+play\s+and\s+move\s+to\s+search\s+for\s+/i,
  /^change\s+the\s+play\s+and\s+move\s+to\s+search\s+/i,
  /^change\s+the\s+song\s+and\s+move\s+to\s+search\s+for\s+/i,
  /^change\s+the\s+song\s+and\s+move\s+to\s+search\s+/i,
  /^change\s+the\s+query\s+and\s+move\s+to\s+search\s+for\s+/i,
  /^change\s+the\s+query\s+and\s+move\s+to\s+search\s+/i,
  /^change\s+and\s+move\s+to\s+search\s+for\s+/i,
  /^change\s+and\s+move\s+to\s+search\s+/i,
  /^change\s+to\s+search\s+for\s+/i,
  /^change\s+to\s+search\s+/i,
  /^move\s+to\s+search\s+for\s+/i,
  /^move\s+to\s+search\s+/i,
  /^change\s+the\s+video\s+and\s+search\s+for\s+/i,
  /^change\s+the\s+video\s+and\s+search\s+/i,
  /^change\s+the\s+play\s+and\s+search\s+for\s+/i,
  /^change\s+the\s+play\s+and\s+search\s+/i,
  /^change\s+the\s+song\s+and\s+search\s+for\s+/i,
  /^change\s+the\s+song\s+and\s+search\s+/i,
  /^change\s+and\s+search\s+for\s+/i,
  /^change\s+and\s+search\s+/i,
  /^change\s+the\s+search\s+to\s+/i,
  /^change\s+the\s+video\s+to\s+/i,
  /^change\s+the\s+song\s+to\s+/i,
  /^change\s+the\s+play\s+to\s+/i,
  /^change\s+query\s+to\s+/i,
  /^change\s+search\s+to\s+/i,
  // Platform + action combos
  /^open\s+youtube\s+and\s+search\s+for\s+/i,
  /^open\s+youtube\s+and\s+search\s+/i,
  /^open\s+youtube\s+and\s+play\s+/i,
  /^open\s+youtube\s+and\s+watch\s+/i,
  /^open\s+google\s+and\s+search\s+for\s+/i,
  /^open\s+google\s+and\s+search\s+/i,
  /^open\s+wikipedia\s+and\s+search\s+for\s+/i,
  /^open\s+wikipedia\s+and\s+search\s+/i,
  /^open\s+wikipedia\s+and\s+find\s+/i,
  /^search\s+youtube\s+for\s+/i,
  /^search\s+youtube\s+/i,
  /^youtube\s+search\s+for\s+/i,
  /^youtube\s+search\s+/i,
  /^search\s+google\s+for\s+/i,
  /^search\s+google\s+/i,
  /^google\s+search\s+for\s+/i,
  /^google\s+search\s+/i,
  /^search\s+wikipedia\s+for\s+/i,
  /^search\s+wikipedia\s+/i,
  /^play\s+on\s+youtube\s+/i,
  /^watch\s+on\s+youtube\s+/i,
  /^listen\s+to\s+on\s+youtube\s+/i,
  /^find\s+videos?\s+explaining\s+/i,
  /^find\s+courses?\s+about\s+/i,
  /^find\s+videos?\s+about\s+/i,
  /^show\s+me\s+videos?\s+about\s+/i,
  /^show\s+me\s+courses?\s+about\s+/i,
  /^show\s+me\s+/i,
];

const SINGLE_PREFIXES: RegExp[] = [
  /^open\s+youtube\s+/i,
  /^open\s+google\s+/i,
  /^open\s+wikipedia\s+/i,
  /^listen\s+to\s+/i,
  /^search\s+for\s+/i,
  /^search\s+/i,
  /^find\s+/i,
  /^watch\s+/i,
  /^play\s+/i,
  /^listen\s+/i,
  /^start\s+/i,
];

const CONNECTIVE_PREFIXES: RegExp[] = [
  /^and\s+search\s+for\s+/i,
  /^and\s+search\s+/i,
  /^and\s+play\s+/i,
  /^and\s+watch\s+/i,
  /^and\s+/i,
];

const TRAILING_PLATFORM: RegExp = /\s+on\s+(youtube|yt|google|wikipedia)$/i;

/** Remove all routing prefixes and suffixes from a raw message */
function stripRoutingWords(raw: string): string {
  let s = raw.trim();

  // Strip composite prefixes (longest match wins — array is ordered)
  for (const re of COMPOSITE_PREFIXES) {
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }

  // Strip single prefixes
  for (const re of SINGLE_PREFIXES) {
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }

  // Strip connective prefixes that may remain
  for (const re of CONNECTIVE_PREFIXES) {
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }

  // Strip trailing platform names
  s = s.replace(TRAILING_PLATFORM, "").trim();

  return s;
}

/** Format an extracted entity nicely (Title Case with special-casing) */
function formatEntity(raw: string): string {
  if (!raw.trim()) return "";
  return raw
    .trim()
    .split(" ")
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === "ai") return "AI";
      if (lower === "ml") return "ML";
      if (lower === "vs") return "vs";
      if (lower === "by") return "by";
      if (lower === "the") return "the";
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/* ─── Platform Detection ─────────────────────────────────────── */
function detectPlatform(m: string): IntentPlatform {
  if (
    /\b(youtube|yt)\b/.test(m) ||
    /^play\b/.test(m) ||
    /^watch\b/.test(m) ||
    /\b(video|videos|song|songs|music|tutorial|tutorials|course|courses|listen|podcast|podcasts|highlights|bhajan)\b/.test(m) ||
    /\b(change\s+the\s+video|change\s+the\s+play|change\s+the\s+song|change\s+the\s+search|change\s+to\s+search|move\s+to\s+search|change\s+and\s+search|change\s+the\s+query|change\s+query|change\s+search)\b/.test(m)
  ) {
    return "youtube";
  }
  if (/\bwikipedia\b/.test(m)) {
    return "wikipedia";
  }
  if (/\b(google)\b/.test(m) || /^(search|find|look up)\b/.test(m)) {
    return "google";
  }
  return null;
}

/* ─── Action Detection ──────────────────────────────────────── */
function detectAction(m: string, platform: IntentPlatform): IntentAction {
  // "play" intent is only meaningful on YouTube
  if (
    platform === "youtube" &&
    /\b(play|listen\s+to|listen|watch|start)\b/.test(m) &&
    !/search\s+youtube|youtube\s+search|open\s+youtube\s+and\s+search/.test(m)
  ) {
    // Distinguish "play" from "search" for YouTube
    // If the command also contains "search" alongside "play", it's still a play
    // unless the construction is "search youtube and play" which is unusual
    if (/^play\b/.test(m) || /\blisten\s+to\b/.test(m) || /\blisten\b/.test(m)) {
      return "play";
    }
    // "watch <title>" = play intent
    if (/^watch\b/.test(m)) return "play";
  }

  if (
    /\b(search|find|show\s+me|look\s+up)\b/.test(m) ||
    (platform === "wikipedia" && /\b(search|find|about|who\s+is|what\s+is)\b/.test(m))
  ) {
    return "search";
  }

  if (/^open\b/.test(m) && !/(and\s+(search|play|find|watch))/.test(m)) {
    return "open";
  }

  // Fallback — if platform is YouTube and no specific search cue, treat as search
  if (platform === "youtube") return "search";
  if (platform === "google" || platform === "wikipedia") return "search";

  return "none";
}

/* ─── Modifier Extraction ───────────────────────────────────── */
function extractModifiers(entity: string): string[] {
  const mods: string[] = [];
  if (/\bofficialb/.test(entity)) mods.push("official");
  if (/\bmusic video\b/i.test(entity)) mods.push("music video");
  if (/\baudio\b/i.test(entity)) mods.push("audio");
  if (/\blyrics\b/i.test(entity)) mods.push("lyrics");
  return mods;
}

/* ─── Main Parser ───────────────────────────────────────────── */

/**
 * Parse a raw user command into a structured intent.
 *
 * @example
 * parseIntent("Open YouTube and search Arijit Singh")
 * // → { platform: "youtube", action: "search", entity: "Arijit Singh", ... }
 *
 * parseIntent("Play Believer by Imagine Dragons")
 * // → { platform: "youtube", action: "play", entity: "Believer by Imagine Dragons", ... }
 *
 * parseIntent("Open Wikipedia and search Virat Kohli")
 * // → { platform: "wikipedia", action: "search", entity: "Virat Kohli", ... }
 */
export function parseIntent(raw: string): ParsedIntent {
  const m = raw.toLowerCase().trim();

  const platform = detectPlatform(m);
  const action = detectAction(m, platform);
  const entityRaw = stripRoutingWords(raw);
  const entity = formatEntity(entityRaw);
  const modifiers = extractModifiers(entity);

  return {
    platform,
    action,
    entity,
    modifiers,
    raw,
  };
}

/**
 * Check if a message is a multi-step command that needs intent parsing
 * (as opposed to a simple single-word intent that existing routing handles).
 */
export function isComplexCommand(raw: string): boolean {
  const m = raw.toLowerCase().trim();
  return (
    /\band\s+(search|play|find|watch|open)\b/.test(m) ||
    /^open\s+(youtube|google|wikipedia)\s+(and|to)\b/.test(m) ||
    /^(play|watch|listen\s+to)\s+.{4,}/.test(m)
  );
}
