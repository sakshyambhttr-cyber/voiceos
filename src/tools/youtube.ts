/**
 * YouTube Tool — Production Quality Reference Implementation
 *
 * Pipeline:
 *   raw query
 *     → normalizeQuery()          strips command words, preserves content
 *     → classifyQuery()           music | educational | sports | podcast | general
 *     → youtubeService.search()   content-aware candidate pool
 *     → scoreVideo()              multi-factor ranked scoring
 *     → confidenceEngine()        auto-play vs show-choices vs fallback
 *     → voiceResponse()           natural language output
 */

import { youtubeService, classifyQuery, type YouTubeVideo, type QueryContentType } from "@/services/youtube";
import { type ToolStore } from "@/lib/tools";

export interface YouTubeToolResult {
  tool: "youtube.search" | "youtube.play";
  query: string;
  normalizedQuery: string;
  contentType: QueryContentType;
  success: boolean;
  voiceResponse: string;
  videos?: YouTubeVideo[];
  videoUrl?: string;
  videoTitle?: string;
  activeTab: "media";
  browserAction?: {
    actionType: "youtubePlay" | "youtubeSearch";
    target: string;
  };
  updatedStore?: ToolStore;
  debugLog: YouTubeDebugLog;
}

export interface YouTubeDebugLog {
  query: string;
  normalizedQuery: string;
  contentType: QueryContentType;
  topResult: string;
  topScore: number;
  secondScore: number;
  selectionReason: string;
  chosenUrl: string;
}

// ─────────────────────────────────────────────────────────────
// QUERY NORMALIZER
//
// Strips only routing/command words from the raw input.
// Preserves the meaningful content phrase exactly.
//
// "Play Believer by Imagine Dragons"   → "Believer by Imagine Dragons"
// "Open YouTube and search Arijit Singh" → "Arijit Singh"
// "Search CrewAI tutorials"            → "CrewAI tutorials"
// "Play latest Formula 1 highlights"  → "latest Formula 1 highlights"
// ─────────────────────────────────────────────────────────────

const COMPOSITE_PREFIX_PATTERNS: RegExp[] = [
  // Longest patterns first to avoid partial-strip
  /^open\s+youtube\s+and\s+search\s+for\s+/i,
  /^open\s+youtube\s+and\s+search\s+/i,
  /^open\s+youtube\s+and\s+play\s+/i,
  /^open\s+youtube\s+and\s+watch\s+/i,
  /^search\s+youtube\s+for\s+/i,
  /^search\s+youtube\s+/i,
  /^youtube\s+search\s+for\s+/i,
  /^youtube\s+search\s+/i,
  /^find\s+videos?\s+explaining\s+/i,
  /^find\s+courses?\s+about\s+/i,
  /^find\s+videos?\s+about\s+/i,
  /^show\s+me\s+videos?\s+about\s+/i,
  /^show\s+me\s+courses?\s+about\s+/i,
  /^show\s+me\s+/i,
  /^listen\s+to\s+/i,
  /^play\s+on\s+youtube\s+/i,
  /^watch\s+on\s+youtube\s+/i,
  // Change/move commands (for mid-session query updates)
  /^change\s+(?:the\s+)?(?:video|song|play|query|search)?\s*(?:and\s+)?(?:move\s+to\s+)?search\s+(?:for\s+)?/i,
  /^change\s+(?:the\s+)?(?:video|song|play|query|search)\s+to\s+/i,
  /^move\s+to\s+search\s+(?:for\s+)?/i,
];

const SINGLE_PREFIX_PATTERNS: RegExp[] = [
  /^open\s+youtube\s+/i,
  /^search\s+for\s+/i,
  /^search\s+/i,
  /^find\s+/i,
  /^watch\s+/i,
  /^play\s+/i,
  /^listen\s+/i,
  /^start\s+/i,
];

const TRAILING_PLATFORM_PATTERN = /\s+on\s+(youtube|yt)$/i;

// Words that are purely routing noise and NEVER appear in content titles
const PURE_ROUTING_WORDS = new Set([
  "youtube", "yt", "open", "start",
]);

export function normalizeQuery(raw: string): string {
  let s = raw.trim();

  // Strip composite prefixes (longest-first)
  for (const re of COMPOSITE_PREFIX_PATTERNS) {
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }

  // Strip single prefixes
  for (const re of SINGLE_PREFIX_PATTERNS) {
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }

  // Strip trailing platform suffix
  s = s.replace(TRAILING_PLATFORM_PATTERN, "").trim();

  // Strip leading connectives that may remain ("and search for X")
  s = s.replace(/^and\s+(?:search\s+(?:for\s+)?|play\s+|watch\s+)?/i, "");

  // Strip ONLY pure routing words that appear globally — NOT content words like "play", "watch", "search"
  // (those can legitimately be part of a title: "How to play guitar")
  const words = s.split(/\s+/).filter(w => w.length > 0 && !PURE_ROUTING_WORDS.has(w.toLowerCase()));
  s = words.join(" ").trim();

  // Capitalize properly (preserve casing for known acronyms)
  if (s.length > 0) {
    s = s
      .split(" ")
      .map(w => {
        const lower = w.toLowerCase();
        if (lower === "ai") return "AI";
        if (lower === "ml") return "ML";
        if (lower === "f1") return "F1";
        if (lower === "rag") return "RAG";
        if (lower === "llm") return "LLM";
        if (lower === "vs") return "vs";
        // Don't uppercase small connectives mid-string
        if (w !== s.split(" ")[0] && ["by", "of", "the", "a", "an", "and", "in", "for", "to"].includes(lower)) {
          return lower;
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }

  return s || raw.trim(); // never return empty string
}

// ─────────────────────────────────────────────────────────────
// SCORING ENGINE
//
// Produces a score in [0, 1] for a single video against the query.
// Higher is better. Uses content-type-aware rules.
// ─────────────────────────────────────────────────────────────

export function scoreVideo(normalizedQuery: string, video: YouTubeVideo, contentType: QueryContentType): number {
  const q = normalizedQuery.toLowerCase();
  const titleLower = video.title.toLowerCase();
  const channelLower = video.channel.toLowerCase();

  // ── Core word-overlap score (0–50 pts) ────────────────────
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);
  let overlap = 0;
  for (const word of queryWords) {
    if (titleLower.includes(word) || channelLower.includes(word)) overlap++;
  }
  const wordOverlapScore = queryWords.length > 0 ? (overlap / queryWords.length) * 50 : 0;

  // ── Phrase match bonus (0–20 pts) ─────────────────────────
  const phraseScore = (titleLower.includes(q) || channelLower.includes(q)) ? 20 : 0;

  let score = wordOverlapScore + phraseScore;

  // ── Content-type-specific scoring ─────────────────────────
  if (contentType === "music" || video.contentType === "music") {
    // Strongly prefer official artist channels and VEVO (+20)
    if (
      video.isOfficial &&
      (channelLower.includes("vevo") || channelLower.endsWith("topic") ||
       video.isVerifiedChannel || channelLower.includes("official"))
    ) {
      score += 20;
    }
    // Prefer "Official Music Video" label (+15)
    if (/\b(official music video|official video|official audio)\b/.test(titleLower)) {
      score += 15;
    }
    // Verified channel bonus (+10)
    if (video.isVerifiedChannel) score += 10;
    // Exact song-name match (+10)
    const titleWords = titleLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
    const allQueryWordsInTitle = queryWords.every(w => titleWords.includes(w));
    if (allQueryWordsInTitle && queryWords.length >= 2) score += 10;

    // HARD PENALTIES
    if (/\b(reaction|reacting|react to|fan edit|fan made|fan-made|reupload|re-upload|bootleg|tribute|cover|cover version)\b/.test(titleLower)) {
      score -= 50;
    }
    if (/\b(lyrics?)\b/.test(titleLower) && !q.includes("lyric")) {
      score -= 25;
    }
    if (/\b(karaoke|instrumental)\b/.test(titleLower)) {
      score -= 20;
    }
  } else if (contentType === "educational" || video.contentType === "educational") {
    // Trusted creator bonus (+20)
    const trustedChannels = ["fireship", "freecodecamp", "3blue1brown", "ibm technology", "langchain", "google", "microsoft", "ai jason"];
    if (trustedChannels.some(ch => channelLower.includes(ch))) score += 20;
    // Verified channel (+10)
    if (video.isVerifiedChannel) score += 10;
    // Recency bonus: content within 2 years gets full bonus, fades to 0 at 5 years (+10 max)
    if (video.uploadedAt) {
      const ageYears = (new Date("2026-06-07").getTime() - new Date(video.uploadedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
      score += Math.max(0, 1 - ageYears / 5) * 10;
    }
    // View engagement proxy (+5 max)
    if (video.views && video.views > 0) {
      score += Math.min(Math.log10(video.views) / 8, 1.0) * 5;
    }
    // Full course / complete tutorial preference (+8)
    if (/\b(full course|complete|from scratch|beginner to advanced)\b/.test(titleLower)) score += 8;
    // PENALTIES
    if (/\b(#shorts|shorts)\b/.test(titleLower)) score -= 40;
    if (/\b(#short)\b/.test(titleLower)) score -= 40;
  } else if (contentType === "sports" || video.contentType === "sports") {
    // Official broadcaster/league channels (+25)
    const officialSports = ["formula 1", "f1", "espn", "nba", "nfl", "fifa", "icc", "bcci", "bein sports", "sky sports"];
    if (officialSports.some(ch => channelLower.includes(ch)) || video.isOfficial) score += 25;
    if (video.isVerifiedChannel) score += 10;
    // Recency bonus for sports (last year = +15, older fades quickly)
    if (video.uploadedAt) {
      const ageYears = (new Date("2026-06-07").getTime() - new Date(video.uploadedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
      score += Math.max(0, 1 - ageYears / 2) * 15;
    }
    // "highlights" keyword match bonus (+12) — query asking for highlights prefers highlight videos
    if (q.includes("highlights") && titleLower.includes("highlights")) score += 12;
    // Alias: "f1" in title counts as matching "formula 1" in query
    if ((q.includes("formula") || q.includes("f1")) && (titleLower.includes("formula") || channelLower.includes("formula 1") || channelLower.includes("f1"))) {
      score += 8;
    }
    // PENALTIES
    if (/\b(fan clip|random edit|fan upload|fan video|fan made)\b/.test(titleLower)) score -= 40;

  } else {
    // General fallback bonuses
    if (video.isOfficial) score += 10;
    if (video.isVerifiedChannel) score += 10;
  }

  // Clamp to [0, 1]
  return Math.min(Math.max(score / 100, 0.0), 1.0);
}

// ─────────────────────────────────────────────────────────────
// NATURAL VOICE RESPONSE BUILDER
// ─────────────────────────────────────────────────────────────

function buildVoiceResponse(
  action: "play" | "search" | "fallback",
  video: YouTubeVideo | null,
  query: string,
  contentType: QueryContentType
): string {
  if (action === "fallback") {
    return `I couldn't find a direct match for "${query}", so I'm opening the YouTube search results.`;
  }

  if (action === "search") {
    return `Here are the top YouTube results for "${query}".`;
  }

  if (!video) return `Playing "${query}" on YouTube.`;

  const title = video.title;
  const titleLower = title.toLowerCase();

  // Music: distinguish official MV vs generic
  if (contentType === "music" || video.contentType === "music") {
    if (/\b(official music video)\b/.test(titleLower)) {
      return `I found the official music video for "${query.split(" ").slice(0, 3).join(" ")}". Playing now.`;
    }
    if (/\b(official video|official audio)\b/.test(titleLower)) {
      return `I found the official video — "${title}". Playing now.`;
    }
    return `Playing "${title}" on YouTube.`;
  }

  // Sports
  if (contentType === "sports" || video.contentType === "sports") {
    if (titleLower.includes("highlights")) {
      return `I found the latest highlights — "${title}". Playing now.`;
    }
    return `Playing "${title}" on YouTube.`;
  }

  // Educational
  if (contentType === "educational" || video.contentType === "educational") {
    if (titleLower.includes("full course") || titleLower.includes("from scratch")) {
      return `I found a complete tutorial — "${title}". Playing now.`;
    }
    return `Playing "${title}" — a tutorial from ${video.channel}.`;
  }

  return `Playing "${title}" on YouTube.`;
}

// ─────────────────────────────────────────────────────────────
// YOUTUBE SEARCH TOOL
// ─────────────────────────────────────────────────────────────

export const YouTubeSearchTool = {
  name: "youtube.search" as const,

  execute(query: string, store: ToolStore): YouTubeToolResult {
    const normalized = normalizeQuery(query);
    const contentType = classifyQuery(normalized);
    const searchRes = youtubeService.search(normalized);
    const videos = searchRes.videos;

    const updatedStore: ToolStore = { ...store, youtubeSearchResults: videos };
    const debugLog: YouTubeDebugLog = {
      query,
      normalizedQuery: normalized,
      contentType,
      topResult: videos[0]?.title ?? "none",
      topScore: 0,
      secondScore: 0,
      selectionReason: "Returning search results without auto-play.",
      chosenUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`,
    };

    return {
      tool: "youtube.search",
      query,
      normalizedQuery: normalized,
      contentType,
      success: true,
      voiceResponse: buildVoiceResponse("search", null, normalized, contentType),
      videos,
      activeTab: "media",
      browserAction: {
        actionType: "youtubeSearch",
        target: normalized,
      },
      updatedStore,
      debugLog,
    };
  },
};

// ─────────────────────────────────────────────────────────────
// YOUTUBE PLAY TOOL
// ─────────────────────────────────────────────────────────────

export const YouTubePlayTool = {
  name: "youtube.play" as const,

  execute(query: string, store: ToolStore): YouTubeToolResult {
    const normalized = normalizeQuery(query);
    const contentType = classifyQuery(normalized);

    // 1. Retrieve candidates
    const searchRes = youtubeService.search(normalized);
    const candidates = searchRes.videos ?? [];

    // 2. Score each candidate
    const scored = candidates
      .map(video => ({ video, score: scoreVideo(normalized, video, contentType) }))
      .sort((a, b) => {
        // Primary: score desc. Tie-break: views desc.
        if (Math.abs(b.score - a.score) > 0.005) return b.score - a.score;
        return (b.video.views ?? 0) - (a.video.views ?? 0);
      });

    const top = scored[0];
    const second = scored[1];
    const topScore = top?.score ?? 0;
    const secondScore = second?.score ?? 0;

    // ── DEBUG LOG ─────────────────────────────────────────────
    const debugLog: YouTubeDebugLog = {
      query,
      normalizedQuery: normalized,
      contentType,
      topResult: top?.video.title ?? "none",
      topScore,
      secondScore,
      selectionReason: "", // filled below
      chosenUrl: "",       // filled below
    };

    // ── CONFIDENCE ENGINE ─────────────────────────────────────
    // Thresholds:
    //   CLEAR_WINNER_MARGIN = 0.12  → auto-play if top beats second by ≥ 12%
    //   MIN_AUTOPLAY_SCORE  = 0.25  → never auto-play with very weak confidence
    const CLEAR_WINNER_MARGIN = 0.12;
    const MIN_AUTOPLAY_SCORE = 0.25;

    // ── CASE 0: No candidates → open search page ──────────────
    if (candidates.length === 0 || !top) {
      debugLog.selectionReason = "No candidates returned by service. Falling back to YouTube search page.";
      debugLog.chosenUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`;

      console.log(`[YouTube] Query: "${query}" | Normalized: "${normalized}" | ContentType: ${contentType}`);
      console.log(`[YouTube] NO CANDIDATES — fallback to search page`);

      return {
        tool: "youtube.play",
        query,
        normalizedQuery: normalized,
        contentType,
        success: true,
        voiceResponse: buildVoiceResponse("fallback", null, normalized, contentType),
        activeTab: "media",
        browserAction: {
          actionType: "youtubeSearch",
          target: normalized,
        },
        updatedStore: store,
        debugLog,
      };
    }

    // ── CASE 1: Clear winner (or only one candidate) → auto-play ──
    const isClearWinner =
      !second ||
      (topScore - secondScore >= CLEAR_WINNER_MARGIN && topScore >= MIN_AUTOPLAY_SCORE);

    if (isClearWinner) {
      debugLog.selectionReason = !second
        ? `Only one candidate (score ${topScore.toFixed(3)}). Auto-playing.`
        : `Clear winner: top score ${topScore.toFixed(3)} beats second ${secondScore.toFixed(3)} by ${(topScore - secondScore).toFixed(3)} ≥ ${CLEAR_WINNER_MARGIN} margin.`;
      debugLog.chosenUrl = top.video.url;

      console.log(`[YouTube] Query: "${query}" | Normalized: "${normalized}" | ContentType: ${contentType}`);
      console.log(`[YouTube] CLEAR WINNER: "${top.video.title}" | score=${topScore.toFixed(3)} | url=${top.video.url}`);
      console.log(`[YouTube] Reason: ${debugLog.selectionReason}`);

      return {
        tool: "youtube.play",
        query,
        normalizedQuery: normalized,
        contentType,
        success: true,
        voiceResponse: buildVoiceResponse("play", top.video, normalized, contentType),
        videoUrl: top.video.url,
        videoTitle: top.video.title,
        activeTab: "media",
        browserAction: {
          actionType: "youtubePlay",
          target: top.video.url,
        },
        updatedStore: { ...store, youtubeSearchResults: undefined },
        debugLog,
      };
    }

    // ── CASE 2: Scores are close → show top 3 choices ─────────
    // But if top score is very high (≥ 0.85), still auto-play
    if (topScore >= 0.85) {
      debugLog.selectionReason = `High confidence (${topScore.toFixed(3)} ≥ 0.85) despite close second. Auto-playing top result.`;
      debugLog.chosenUrl = top.video.url;

      console.log(`[YouTube] HIGH CONFIDENCE auto-play: "${top.video.title}" | score=${topScore.toFixed(3)}`);

      return {
        tool: "youtube.play",
        query,
        normalizedQuery: normalized,
        contentType,
        success: true,
        voiceResponse: buildVoiceResponse("play", top.video, normalized, contentType),
        videoUrl: top.video.url,
        videoTitle: top.video.title,
        activeTab: "media",
        browserAction: {
          actionType: "youtubePlay",
          target: top.video.url,
        },
        updatedStore: { ...store, youtubeSearchResults: undefined },
        debugLog,
      };
    }

    // Ambiguous — present top 3
    const top3 = scored.slice(0, 3).map(s => s.video);
    debugLog.selectionReason = `Ambiguous: top ${topScore.toFixed(3)} vs second ${secondScore.toFixed(3)} — margin ${(topScore - secondScore).toFixed(3)} < ${CLEAR_WINNER_MARGIN}. Showing top 3.`;
    debugLog.chosenUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`;

    console.log(`[YouTube] AMBIGUOUS: showing top 3 | top="${top.video.title}" score=${topScore.toFixed(3)}`);
    console.log(`[YouTube] Reason: ${debugLog.selectionReason}`);

    return {
      tool: "youtube.play",
      query,
      normalizedQuery: normalized,
      contentType,
      success: true,
      voiceResponse: `I found a few good matches for "${normalized}". Here are the top 3 options.`,
      videos: top3,
      activeTab: "media",
      updatedStore: { ...store, youtubeSearchResults: top3 },
      debugLog,
    };
  },
};

// Legacy alias for backward compatibility
export { normalizeQuery as cleanAndValidateYouTubeQuery };
