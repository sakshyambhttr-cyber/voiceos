import { youtubeService, type YouTubeVideo } from "@/services/youtube";
import { type ToolStore } from "@/lib/tools";

export interface YouTubeToolResult {
  tool: "youtube.search" | "youtube.play";
  query: string;
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
}

// Cleans command words and extracts the core search/playback entity
// Ensures search queries are plain text and never contain URLs
export function cleanAndValidateYouTubeQuery(message: string): string {
  let clean = message.trim();

  // If message itself is a URL or contains a URL, extract the query parameters
  if (/https?:\/\//i.test(clean)) {
    try {
      const urlMatch = clean.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        const urlStr = urlMatch[0];
        const url = new URL(urlStr);
        if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
          const searchParam = url.searchParams.get("search_query");
          const videoParam = url.searchParams.get("v");
          if (searchParam) {
            clean = searchParam;
          } else if (videoParam) {
            clean = videoParam;
          } else {
            clean = clean.replace(urlStr, "").trim();
          }
        } else {
          clean = clean.replace(urlStr, "").trim();
        }
      }
    } catch {
      clean = clean.replace(/https?:\/\/[^\s]+/gi, "").trim();
    }
  }

  // Strip any remaining YouTube or other URLs from the text
  clean = clean.replace(/(www\.)?youtube\.com\/[^\s]*/gi, "");
  clean = clean.replace(/(www\.)?youtu\.be\/[^\s]*/gi, "");
  clean = clean.replace(/https?:\/\/[^\s]*/gi, "");

  // Convert to lowercase for command word stripping
  clean = clean.toLowerCase();

  // 1. Remove composite prefix patterns (longest first)
  const prefixPatterns = [
    /^(open\s+youtube\s+and\s+search\s+for)/gi,
    /^(open\s+youtube\s+and\s+search)/gi,
    /^(open\s+youtube\s+and\s+play)/gi,
    /^(open\s+youtube\s+and\s+watch)/gi,
    /^(search\s+youtube\s+for)/gi,
    /^(search\s+youtube)/gi,
    /^(search\s+for)/gi,
    /^(youtube\s+search\s+for)/gi,
    /^(youtube\s+search)/gi,
    /^(find\s+videos\s+explaining)/gi,
    /^(find\s+courses\s+about)/gi,
    /^(find\s+videos\s+about)/gi,
    /^(show\s+me\s+videos\s+about)/gi,
    /^(show\s+me\s+courses\s+about)/gi,
    /^(play\s+on\s+youtube)/gi,
    /^(play\s+youtube)/gi,
    /^(play\s+yt)/gi,
    /^(watch\s+on\s+youtube)/gi,
    /^(watch\s+youtube)/gi,
    /^(listen\s+to\s+on\s+youtube)/gi,
    /^(listen\s+to)/gi,
    /^(start\s+on\s+youtube)/gi,
  ];

  for (const pattern of prefixPatterns) {
    clean = clean.replace(pattern, "");
  }

  // 2. Remove single prefix patterns if still at start
  const singlePrefixes = [
    /^(open\s+youtube)/gi,
    /^(search)/gi,
    /^(find)/gi,
    /^(play)/gi,
    /^(watch)/gi,
    /^(open)/gi,
    /^(listen)/gi,
    /^(start)/gi,
    /^(show\s+me)/gi,
  ];
  for (const pattern of singlePrefixes) {
    clean = clean.replace(pattern, "");
  }

  // 3. Remove connectives
  clean = clean.replace(/^(and\s+search\s+for)/gi, "");
  clean = clean.replace(/^(and\s+search)/gi, "");
  clean = clean.replace(/^(and\s+play)/gi, "");
  clean = clean.replace(/^(and\s+watch)/gi, "");
  clean = clean.replace(/^(and)/gi, "");

  // 4. Remove suffixes
  clean = clean.replace(/\s+on\s+(youtube|yt)$/gi, "");

  // 5. Validation: Strip forbidden command phrases globally ONLY if they appear at the start
  // Do NOT strip words like "play" or "watch" from mid-query — they may be content words
  const globalForbidden = [
    /^(open\s+youtube)\b/gi,
    /^(search\s+youtube)\b/gi,
    /^(search\s+for)\b/gi,
  ];

  for (const pattern of globalForbidden) {
    clean = clean.replace(pattern, "");
  }

  let finalQuery = clean.replace(/\s+/g, " ").trim();
  
  // Format words nicely
  if (finalQuery.length > 0) {
    finalQuery = finalQuery
      .split(" ")
      .map(word => {
        if (word === "ai") return "AI";
        if (word === "vs") return "vs";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  return finalQuery;
}

// Confidence scorer: uses semantic word overlap, channel/artist match, and exact phrase match
function calculateConfidence(query: string, video: YouTubeVideo): number {
  const q = query.toLowerCase().trim();
  const title = video.title.toLowerCase();
  const channel = video.channel.toLowerCase();

  // Strip common filler words from query for cleaner matching
  const cleanQ = q
    .replace(/\b(play|watch|listen\s+to|listen|start|open|on|youtube|yt|video|videos|by|the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let score = 0;

  // 1. Channel / Artist match (0.3)
  // Split channel into meaningful words and check if query contains any of them
  const channelWords = channel.split(/[\s\-_]+/).filter(w => w.length > 3);
  for (const cWord of channelWords) {
    if (cleanQ.includes(cWord)) {
      score += 0.3;
      break;
    }
  }

  // 2. Exact phrase match in title (0.35)
  // Check if the cleaned query (or a significant part) appears in the title
  const cleanTitle = title.replace(/[^a-z0-9\s]/g, "");
  if (cleanQ && cleanTitle.includes(cleanQ)) {
    score += 0.35;
  } else if (cleanQ.length > 4) {
    // Check reverse: if title phrase appears in query (useful for short titles)
    const cleanTitleWords = cleanTitle.split(/\s+/).filter(w => w.length > 3);
    const matchingTitleWords = cleanTitleWords.filter(w => cleanQ.includes(w));
    if (cleanTitleWords.length > 0 && matchingTitleWords.length / cleanTitleWords.length >= 0.7) {
      score += 0.25;
    }
  }

  // 3. Word overlap ratio (0.35)
  const queryWords = cleanQ.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length > 0) {
    let matches = 0;
    for (const word of queryWords) {
      if (title.includes(word) || channel.includes(word)) {
        matches++;
      }
    }
    score += (matches / queryWords.length) * 0.35;
  }

  return Math.min(score, 1.0);
}

export const YouTubeSearchTool = {
  name: "youtube.search" as const,
  execute(query: string, store: ToolStore): YouTubeToolResult {
    const cleanQuery = cleanAndValidateYouTubeQuery(query);
    const res = youtubeService.search(cleanQuery);
    const updatedStore = {
      ...store,
      youtubeSearchResults: res.videos,
    };
    return {
      tool: "youtube.search",
      query: cleanQuery,
      success: true,
      voiceResponse: "Here are the most relevant YouTube results.",
      videos: res.videos,
      activeTab: "media",
      browserAction: {
        actionType: "youtubeSearch",
        target: cleanQuery, // Pass clean query directly to generate search URL exactly once on client
      },
      updatedStore,
    };
  }
};

export const YouTubePlayTool = {
  name: "youtube.play" as const,
  execute(query: string, store: ToolStore): YouTubeToolResult {
    const cleanQuery = cleanAndValidateYouTubeQuery(query);
    // 1. Search YouTube programmatically using the search service
    const searchRes = youtubeService.search(cleanQuery);
    const videos = searchRes.videos || [];

    // 2. Score and rank candidate videos using metadata: Relevance, Views, Recency, and Official content preference
    const scoredCandidates = videos.map(video => {
      const relevance = calculateConfidence(cleanQuery, video);
      
      let compositeScore = relevance * 100;
      if (relevance > 0) {
        if (video.isOfficial) compositeScore += 15;
        compositeScore += Math.min((video.views || 0) / 100000000, 10); // views boost
        
        const uploadDate = new Date(video.uploadedAt || "2015-01-01");
        const ageInYears = (new Date("2026-06-07").getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        compositeScore += Math.max(0, 5 - ageInYears);
      }

      return {
        video,
        relevance, // Use relevance for confidence thresholds
        compositeScore
      };
    });

    // Sort by composite score descending
    scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    const topCandidate = scoredCandidates[0];
    const topConfidence = topCandidate ? topCandidate.relevance : 0;

    // 3. Branch based on confidence thresholds
    if (topConfidence > 0.8) {
      // High Confidence (>0.8) -> Auto-play
      const videoUrl = topCandidate.video.url;
      const videoTitle = topCandidate.video.title;
      
      const updatedStore = {
        ...store,
        youtubeSearchResults: undefined, // Clear results
      };

      return {
        tool: "youtube.play",
        query: cleanQuery,
        success: true,
        voiceResponse: "Playing the most relevant result on YouTube.",
        videoUrl,
        videoTitle,
        activeTab: "media",
        browserAction: {
          actionType: "youtubePlay",
          target: videoUrl,
        },
        updatedStore,
      };
    } else if (topConfidence >= 0.5) {
      // Medium Confidence (0.5 to 0.8) -> Show top 3 candidate videos
      const candidates = scoredCandidates.slice(0, 3).map(c => c.video);
      const updatedStore = {
        ...store,
        youtubeSearchResults: candidates,
      };

      return {
        tool: "youtube.play",
        query: cleanQuery,
        success: true,
        voiceResponse: "I found several relevant videos. Which one would you like?",
        activeTab: "media",
        updatedStore,
      };
    } else {
      // Low Confidence (<0.5) -> Open YouTube search page (graceful fallback)
      const updatedStore = {
        ...store,
        youtubeSearchResults: videos, // Show all search results in UI
      };

      return {
        tool: "youtube.play",
        query: cleanQuery,
        success: true,
        voiceResponse: "Here are the most relevant YouTube results.",
        activeTab: "media",
        browserAction: {
          actionType: "youtubeSearch",
          target: cleanQuery, // Pass clean query directly to client browser search
        },
        updatedStore,
      };
    }
  }
};
