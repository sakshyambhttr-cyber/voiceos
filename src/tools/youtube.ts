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
    /^(change\s+the\s+video\s+and\s+move\s+to\s+search\s+for)/gi,
    /^(change\s+the\s+video\s+and\s+move\s+to\s+search)/gi,
    /^(change\s+the\s+play\s+and\s+move\s+to\s+search\s+for)/gi,
    /^(change\s+the\s+play\s+and\s+move\s+to\s+search)/gi,
    /^(change\s+the\s+song\s+and\s+move\s+to\s+search\s+for)/gi,
    /^(change\s+the\s+song\s+and\s+move\s+to\s+search)/gi,
    /^(change\s+the\s+query\s+and\s+move\s+to\s+search\s+for)/gi,
    /^(change\s+the\s+query\s+and\s+move\s+to\s+search)/gi,
    /^(change\s+and\s+move\s+to\s+search\s+for)/gi,
    /^(change\s+and\s+move\s+to\s+search)/gi,
    /^(change\s+to\s+search\s+for)/gi,
    /^(change\s+to\s+search)/gi,
    /^(move\s+to\s+search\s+for)/gi,
    /^(move\s+to\s+search)/gi,
    /^(change\s+the\s+video\s+and\s+search\s+for)/gi,
    /^(change\s+the\s+video\s+and\s+search)/gi,
    /^(change\s+the\s+play\s+and\s+search\s+for)/gi,
    /^(change\s+the\s+play\s+and\s+search)/gi,
    /^(change\s+the\s+song\s+and\s+search\s+for)/gi,
    /^(change\s+the\s+song\s+and\s+search)/gi,
    /^(change\s+and\s+search\s+for)/gi,
    /^(change\s+and\s+search)/gi,
    /^(change\s+the\s+search\s+to)/gi,
    /^(change\s+the\s+video\s+to)/gi,
    /^(change\s+the\s+song\s+to)/gi,
    /^(change\s+the\s+play\s+to)/gi,
    /^(change\s+query\s+to)/gi,
    /^(change\s+search\s+to)/gi,
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
  let cleanQ = q
    .replace(/\b(play|watch|listen\s+to|listen|start|open|on|youtube|yt|video|videos|by|the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanQ && q) {
    cleanQ = q;
  }

  // 1. Semantic similarity (word overlap) - 40% (0.40)
  const queryWords = cleanQ.split(/\s+/).filter(w => w.length > 0);
  let semanticScore = 0;
  if (queryWords.length > 0) {
    let matches = 0;
    for (const word of queryWords) {
      if (title.includes(word) || channel.includes(word)) {
        matches++;
      }
    }
    semanticScore = matches / queryWords.length;
  }

  // 2. Title match (exact/partial phrase) - 25% (0.25)
  const titleClean = title.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const queryClean = cleanQ.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

  let titleScore = 0;
  if (queryClean && titleClean.includes(queryClean)) {
    titleScore = 1.0;
  } else if (queryClean.length > 4) {
    const titleWords = titleClean.split(/\s+/).filter(w => w.length > 3);
    const matchingTitleWords = titleWords.filter(w => queryClean.includes(w));
    if (titleWords.length > 0 && matchingTitleWords.length / titleWords.length >= 0.7) {
      titleScore = 0.7;
    }
  }

  // 3. Popularity (views) - 20% (0.20)
  const views = video.views || 0;
  const popularityScore = views > 0 ? Math.min(Math.log10(views) / 9, 1.0) : 0;

  // 4. Channel credibility (isOfficial) - 10% (0.10)
  const credibilityScore = (video.isOfficial || video.isVerifiedChannel) ? 1.0 : 0.0;

  // 5. Recency (upload date proximity) - 5% (0.05)
  const uploadDate = new Date(video.uploadedAt || "2015-01-01");
  const currentDate = new Date("2026-06-07");
  const ageInYears = (currentDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const recencyScore = Math.max(0, 1 - ageInYears / 10);

  const confidence = (semanticScore * 0.40) + (titleScore * 0.25) + (popularityScore * 0.20) + (credibilityScore * 0.10) + (recencyScore * 0.05);

  return Math.min(Math.max(confidence, 0.0), 1.0);
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
        const titleLower = video.title.toLowerCase();
        const channelLower = video.channel.toLowerCase();

        if (video.contentType === "music") {
          // +20 for official VEVO/artist channels
          if (channelLower.includes("vevo") || video.isOfficial) {
            compositeScore += 20;
          }
          // -30 for fan edits (identified by keywords: "reaction", "cover", "fan", "edit", "lyric fan")
          const isFanEdit = ["reaction", "cover", "fan", "edit", "lyric fan"].some(keyword => titleLower.includes(keyword));
          if (isFanEdit) {
            compositeScore -= 30;
          }
        } else if (video.contentType === "educational") {
          // +15 for established channels (Fireship, FreeCodeCamp, 3Blue1Brown, IBM Technology, LangChain)
          const isEstablished = ["fireship", "freecodecamp", "3blue1brown", "ibm technology", "langchain"].some(ch => channelLower.includes(ch));
          if (isEstablished) {
            compositeScore += 15;
          }
          // -25 for Shorts content (identified by "#shorts" or "shorts")
          const isShorts = titleLower.includes("#shorts") || titleLower.includes("shorts");
          if (isShorts) {
            compositeScore -= 25;
          }
        } else if (video.contentType === "sports") {
          // +20 for official broadcasters
          if (video.isOfficial || video.isVerifiedChannel) {
            compositeScore += 20;
          }
          // -20 for fan uploads (identified by "fan clip", "random edit")
          const isFanUpload = ["fan clip", "random edit", "fan upload", "fan video"].some(keyword => titleLower.includes(keyword));
          if (isFanUpload) {
            compositeScore -= 20;
          }
        }
      }

      // Final relevance after content selection rules, bounded at [0.0, 1.0]
      const finalRelevance = Math.min(Math.max(compositeScore / 100, 0.0), 1.0);

      return {
        video,
        relevance: finalRelevance, // Use final relevance for confidence thresholds
        compositeScore
      };
    });

    // Sort primarily by views descending, breaking ties with composite score
    scoredCandidates.sort((a, b) => {
      const viewsA = a.video.views || 0;
      const viewsB = b.video.views || 0;
      if (viewsB !== viewsA) {
        return viewsB - viewsA;
      }
      return b.compositeScore - a.compositeScore;
    });

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
      const candidates = scoredCandidates.map(c => c.video);
      const updatedStore = {
        ...store,
        youtubeSearchResults: candidates, // Show all search results in UI, sorted by views
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
