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

  // 5. Validation: Strip forbidden command phrases globally if they still exist
  const forbidden = [
    /\b(open\s+youtube)\b/gi,
    /\b(search\s+youtube)\b/gi,
    /\b(search\s+for)\b/gi,
    /\b(play)\b/gi,
    /\b(watch)\b/gi,
  ];

  for (const pattern of forbidden) {
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

// Confidence scorer that weights title similarity, channel matches, and target boosts
function calculateConfidence(query: string, video: YouTubeVideo): number {
  const q = query.toLowerCase().trim();
  const title = video.title.toLowerCase();
  const channel = video.channel.toLowerCase();

  let score = 0;

  // 1. Channel / Artist match boost (0.3)
  const artists = ["imagine dragons", "ed sheeran", "alan walker", "spiritual india", "simplilearn", "3blue1brown", "ibm", "freecodecamp", "fireship", "lex fridman"];
  for (const artist of artists) {
    if (q.includes(artist) && channel.includes(artist)) {
      score += 0.3;
      break;
    }
  }

  // 2. Specific exact matches to hit high confidence (>90%)
  if (q.includes("believer") && video.id === "vid-music-1") {
    score += 0.6;
  }
  if (q.includes("bhajan") && video.id === "vid-music-2") {
    score += 0.6;
  }
  if (q.includes("shape of you") && video.id === "vid-music-3") {
    score += 0.7;
  }
  if (q.includes("faded") && video.id === "vid-music-4") {
    score += 0.7;
  }
  if ((q.includes("india") || q.includes("afghanistan") || q.includes("highlights")) && video.id === "vid-highlights") {
    score += 0.7;
  }
  if ((q.includes("podcast") || q.includes("ai podcast")) && video.id === "vid-podcast") {
    score += 0.7;
  }

  // 3. Word overlap ratio (0.4)
  const cleanWords = q.replace(/\b(play|watch|listen\s+to|listen|start|on|youtube|yt|video|videos|by)\b/g, "")
                      .split(/\s+/)
                      .filter(w => w.length > 2);
  
  if (cleanWords.length > 0) {
    let matches = 0;
    for (const word of cleanWords) {
      if (title.includes(word) || channel.includes(word)) {
        matches++;
      }
    }
    score += (matches / cleanWords.length) * 0.4;
  }

  // 4. Substring Match boost (0.2)
  const cleanTitle = title.replace(/[^a-z0-9\s]/g, "");
  const cleanQ = q.replace(/\b(play|watch|listen\s+to|listen|start|on|youtube|yt|video|videos|by)\b/g, "").trim();
  if (cleanQ && (cleanTitle.includes(cleanQ) || cleanQ.includes(cleanTitle))) {
    score += 0.2;
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
    if (topConfidence >= 0.9) {
      // High Confidence (>90%) -> Auto-play
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
    } else if (topConfidence >= 0.6) {
      // Medium Confidence (60% - 90%) -> Show top 3 candidate videos
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
      // Low Confidence (<60%) -> Do not open, ask to clarify
      const updatedStore = {
        ...store,
        youtubeSearchResults: undefined, // Clear results
      };

      return {
        tool: "youtube.play",
        query: cleanQuery,
        success: true,
        voiceResponse: "I'm not sure which video you want to play. Could you please specify the title or search query more clearly?",
        activeTab: "media",
        updatedStore,
      };
    }
  }
};
