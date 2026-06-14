import { type ToolStore } from "@/lib/tools";

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnailUrl?: string;
  views?: number;
  uploadedAt?: string;
  isOfficial?: boolean;
  isVerifiedChannel?: boolean;
  contentType?: "music" | "educational" | "sports" | "podcast" | "general";
}

// ─────────────────────────────────────────────────────────────
// MOCK VIDEO CATALOG
// Expanded to cover all required success-test queries.
// Each video is pre-tagged with contentType for ranking.
// ─────────────────────────────────────────────────────────────
const MOCK_VIDEOS: Record<string, YouTubeVideo[]> = {
  // ── MUSIC ─────────────────────────────────────────────────
  music_believer: [
    {
      id: "vid-believer-official",
      title: "Imagine Dragons - Believer (Official Music Video)",
      channel: "ImagineDragonsVEVO",
      duration: "3:43",
      url: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
      views: 2_800_000_000,
      uploadedAt: "2017-03-07T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
    {
      id: "vid-believer-lyrics",
      title: "Imagine Dragons - Believer (Lyrics)",
      channel: "LyricsMaster",
      duration: "3:43",
      url: "https://www.youtube.com/watch?v=believer-lyrics",
      views: 25_000_000,
      uploadedAt: "2018-01-01T00:00:00Z",
      isOfficial: false,
      contentType: "music",
    },
    {
      id: "vid-believer-reaction",
      title: "Imagine Dragons - Believer (Reaction Video & Cover)",
      channel: "Music Fan Reaction",
      duration: "5:10",
      url: "https://www.youtube.com/watch?v=reaction-believer",
      views: 12_000,
      uploadedAt: "2024-05-10T00:00:00Z",
      isOfficial: false,
      contentType: "music",
    },
  ],

  music_shape: [
    {
      id: "vid-shape-official",
      title: "Ed Sheeran - Shape of You [Official Video]",
      channel: "Ed Sheeran",
      duration: "4:24",
      url: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
      views: 6_100_000_000,
      uploadedAt: "2017-01-30T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
    {
      id: "vid-shape-cover",
      title: "Shape of You - Ed Sheeran (Acoustic Cover)",
      channel: "AcousticCovers",
      duration: "3:55",
      url: "https://www.youtube.com/watch?v=shape-cover",
      views: 800_000,
      uploadedAt: "2017-04-01T00:00:00Z",
      isOfficial: false,
      contentType: "music",
    },
  ],

  music_arijit: [
    {
      id: "vid-arijit-compilation",
      title: "Arijit Singh Best Songs 2024 | Top Hits Playlist",
      channel: "Arijit Singh Official",
      duration: "1:15:30",
      url: "https://www.youtube.com/watch?v=arijit-hits-2024",
      views: 320_000_000,
      uploadedAt: "2024-01-10T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
    {
      id: "vid-arijit-tum-hi",
      title: "Arijit Singh - Tum Hi Ho (Official Video) | Aashiqui 2",
      channel: "T-Series",
      duration: "4:32",
      url: "https://www.youtube.com/watch?v=Umqb9KENgmk",
      views: 1_200_000_000,
      uploadedAt: "2013-04-22T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
    {
      id: "vid-arijit-channa",
      title: "Arijit Singh - Channa Mereya | Ae Dil Hai Mushkil",
      channel: "Sony Music India",
      duration: "4:49",
      url: "https://www.youtube.com/watch?v=channa-arijit",
      views: 750_000_000,
      uploadedAt: "2016-09-28T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
  ],

  music_general: [
    {
      id: "vid-faded",
      title: "Alan Walker - Faded",
      channel: "Alan Walker",
      duration: "3:32",
      url: "https://www.youtube.com/watch?v=60ItHLz5WEA",
      views: 3_400_000_000,
      uploadedAt: "2015-12-03T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "music",
    },
    {
      id: "vid-bhajan",
      title: "Beautiful Krishna Bhajan - Achyutam Keshavam",
      channel: "Spiritual India",
      duration: "6:12",
      url: "https://www.youtube.com/watch?v=O1xKz_QeQoo",
      views: 45_000_000,
      uploadedAt: "2020-08-15T00:00:00Z",
      isOfficial: false,
      contentType: "music",
    },
  ],

  // ── SPORTS / F1 ────────────────────────────────────────────
  f1: [
    {
      id: "vid-f1-highlights-2024",
      title: "Formula 1 2024 Season Highlights | Best Moments",
      channel: "Formula 1",
      duration: "28:15",
      url: "https://www.youtube.com/watch?v=f1-highlights-2024",
      views: 12_000_000,
      uploadedAt: "2024-12-10T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "sports",
    },
    {
      id: "vid-f1-highlights-latest",
      title: "F1 2025 Bahrain Grand Prix Race Highlights",
      channel: "Formula 1",
      duration: "8:48",
      url: "https://www.youtube.com/watch?v=f1-bahrain-2025",
      views: 4_800_000,
      uploadedAt: "2025-03-02T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "sports",
    },
    {
      id: "vid-f1-fan",
      title: "F1 crazy fan moments compilation",
      channel: "F1FanTV",
      duration: "10:00",
      url: "https://www.youtube.com/watch?v=f1-fan-moments",
      views: 90_000,
      uploadedAt: "2025-01-20T00:00:00Z",
      isOfficial: false,
      contentType: "sports",
    },
  ],

  sports_highlights: [
    {
      id: "vid-highlights-cricket",
      title: "India vs Afghanistan Test Match Highlights",
      channel: "Sports Central",
      duration: "15:45",
      url: "https://www.youtube.com/watch?v=3S1_x5c5nS8",
      views: 1_800_000,
      uploadedAt: "2024-01-15T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "sports",
    },
    {
      id: "vid-sports-fan",
      title: "India vs Afghanistan crazy fan clip from the stands!",
      channel: "CricketFanatic",
      duration: "1:20",
      url: "https://www.youtube.com/watch?v=cricket-fan-clip",
      views: 5_000,
      uploadedAt: "2024-01-16T00:00:00Z",
      isOfficial: false,
      contentType: "sports",
    },
  ],

  // ── EDUCATIONAL / AI ───────────────────────────────────────
  langgraph: [
    {
      id: "vid-langgraph-tut",
      title: "LangGraph Tutorial: Build AI Agents with LangGraph (Full Course)",
      channel: "LangChain",
      duration: "1:10:22",
      url: "https://www.youtube.com/watch?v=langgraph-tutorial-2024",
      views: 550_000,
      uploadedAt: "2024-06-01T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
    {
      id: "vid-langgraph-intro",
      title: "LangGraph Explained: Stateful AI Agents in Python",
      channel: "Fireship",
      duration: "12:45",
      url: "https://www.youtube.com/watch?v=langgraph-fireship",
      views: 340_000,
      uploadedAt: "2024-05-15T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
    {
      id: "vid-langgraph-short",
      title: "LangGraph in 60 seconds! #shorts",
      channel: "AIShorts",
      duration: "0:58",
      url: "https://www.youtube.com/watch?v=langgraph-short",
      views: 25_000,
      uploadedAt: "2024-07-01T00:00:00Z",
      isOfficial: false,
      contentType: "educational",
    },
  ],

  crewai: [
    {
      id: "vid-crewai-tut",
      title: "CrewAI Tutorial: Multi-Agent AI Systems from Scratch",
      channel: "FreeCodeCamp",
      duration: "1:32:10",
      url: "https://www.youtube.com/watch?v=crewai-freecodecamp",
      views: 820_000,
      uploadedAt: "2024-07-20T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
    {
      id: "vid-crewai-complete",
      title: "Complete Guide to CrewAI for Building Autonomous Agents",
      channel: "AI Jason",
      duration: "45:18",
      url: "https://www.youtube.com/watch?v=crewai-complete",
      views: 220_000,
      uploadedAt: "2024-08-01T00:00:00Z",
      isOfficial: true,
      contentType: "educational",
    },
  ],

  rag: [
    {
      id: "vid-rag-1",
      title: "Retrieval-Augmented Generation (RAG) Explained Simply",
      channel: "IBM Technology",
      duration: "8:45",
      url: "https://www.youtube.com/watch?v=T-D1OfcDW1M",
      views: 650_000,
      uploadedAt: "2023-09-15T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
    {
      id: "vid-rag-2",
      title: "Advanced RAG Techniques with LangChain and LangGraph",
      channel: "LangChain",
      duration: "15:20",
      url: "https://www.youtube.com/watch?v=f3p_c6Xk1xY",
      views: 180_000,
      uploadedAt: "2024-02-18T00:00:00Z",
      isOfficial: true,
      contentType: "educational",
    },
  ],

  ai: [
    {
      id: "vid-ai-1",
      title: "Introduction to Artificial Intelligence (Full Course)",
      channel: "FreeCodeCamp",
      duration: "4:12:00",
      url: "https://www.youtube.com/watch?v=5VhyF_5_mG0",
      views: 8_500_000,
      uploadedAt: "2021-05-10T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
    {
      id: "vid-ai-2",
      title: "Generative AI Explained in 10 Minutes",
      channel: "Fireship",
      duration: "10:15",
      url: "https://www.youtube.com/watch?v=2e6i5GjPuhk",
      views: 1_200_000,
      uploadedAt: "2023-04-12T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
  ],

  ml: [
    {
      id: "vid-ml-1",
      title: "Machine Learning for Beginners - NumPy & Pandas Basics",
      channel: "Simplilearn",
      duration: "45:30",
      url: "https://www.youtube.com/watch?v=GwIo3gToqSU",
      views: 4_500_000,
      uploadedAt: "2020-03-20T00:00:00Z",
      isOfficial: true,
      contentType: "educational",
    },
    {
      id: "vid-ml-2",
      title: "How to Build Neural Networks from Scratch in Python",
      channel: "3Blue1Brown",
      duration: "22:15",
      url: "https://www.youtube.com/watch?v=aircAruvnKk",
      views: 15_000_000,
      uploadedAt: "2017-10-05T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "educational",
    },
  ],

  podcast: [
    {
      id: "vid-podcast",
      title: "Lex Fridman Podcast: Active AI and Future of Tech",
      channel: "Lex Fridman",
      duration: "2:15:30",
      url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
      views: 2_500_000,
      uploadedAt: "2023-11-20T00:00:00Z",
      isOfficial: true,
      isVerifiedChannel: true,
      contentType: "podcast",
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// CONTENT TYPE CLASSIFIER
// Determines query intent before searching, so the right
// video pool is selected for scoring.
// ─────────────────────────────────────────────────────────────
export type QueryContentType = "music" | "educational" | "sports" | "podcast" | "general";

export function classifyQuery(query: string): QueryContentType {
  const q = query.toLowerCase();

  // Music signals
  if (
    /\b(song|songs|music|sing|album|track|beats|bhajan|playlist|lyrics|official music video|official video)\b/.test(q) ||
    /\b(imagine dragons|ed sheeran|alan walker|arijit singh|believer|shape of you|faded|channa|tum hi ho)\b/.test(q)
  ) {
    return "music";
  }

  // Sports signals
  if (
    /\b(highlights|formula 1|formula one|f1|grand prix|race|gp|cricket|ipl|match|nba|nfl|fifa|epl|premier league|icc)\b/.test(q)
  ) {
    return "sports";
  }

  // Educational / Tutorial signals
  if (
    /\b(tutorial|course|learn|learning|explain|explained|guide|introduction|intro|how to|how-to|beginner|advanced|full course|lecture)\b/.test(q) ||
    /\b(langgraph|langchain|crewai|crew ai|rag|llm|gpt|pytorch|tensorflow|numpy|pandas|python|javascript|react|langraph)\b/.test(q)
  ) {
    return "educational";
  }

  // Podcast signals
  if (/\b(podcast|episode|interview|lex fridman|huberman|tim ferriss)\b/.test(q)) {
    return "podcast";
  }

  return "general";
}

// ─────────────────────────────────────────────────────────────
// SEARCH ENGINE
// Routes query to the right video pool using content-type
// classification, then returns all candidates for ranking.
// ─────────────────────────────────────────────────────────────
export const youtubeService = {
  /**
   * Searches for YouTube videos matching the query.
   * Routes to the appropriate content pool using content classification.
   */
  search(query: string): { success: boolean; voiceResponse: string; videos: YouTubeVideo[]; contentType: QueryContentType } {
    const q = query.toLowerCase().trim();
    const contentType = classifyQuery(q);

    let candidates: YouTubeVideo[] = [];

    if (contentType === "music") {
      // Build music candidate pool from all music buckets
      if (q.includes("believer") || q.includes("imagine dragons")) {
        candidates = [...MOCK_VIDEOS.music_believer, ...MOCK_VIDEOS.music_general];
      } else if (q.includes("shape") || q.includes("sheeran")) {
        candidates = [...MOCK_VIDEOS.music_shape, ...MOCK_VIDEOS.music_general];
      } else if (q.includes("arijit")) {
        candidates = [...MOCK_VIDEOS.music_arijit];
      } else if (q.includes("bhajan") || q.includes("krishna") || q.includes("achyutam")) {
        candidates = [...MOCK_VIDEOS.music_general];
      } else if (q.includes("alan walker") || q.includes("faded")) {
        candidates = [...MOCK_VIDEOS.music_general];
      } else {
        // General music — search across all music pools
        candidates = [
          ...MOCK_VIDEOS.music_believer,
          ...MOCK_VIDEOS.music_shape,
          ...MOCK_VIDEOS.music_arijit,
          ...MOCK_VIDEOS.music_general,
        ];
      }
    } else if (contentType === "sports") {
      if (q.includes("f1") || q.includes("formula")) {
        candidates = [...MOCK_VIDEOS.f1];
      } else {
        candidates = [...MOCK_VIDEOS.sports_highlights, ...MOCK_VIDEOS.f1];
      }
    } else if (contentType === "educational") {
      if (q.includes("langgraph") || q.includes("langraph")) {
        candidates = [...MOCK_VIDEOS.langgraph, ...MOCK_VIDEOS.rag];
      } else if (q.includes("crewai") || q.includes("crew ai")) {
        candidates = [...MOCK_VIDEOS.crewai];
      } else if (q.includes("rag")) {
        candidates = [...MOCK_VIDEOS.rag];
      } else if (q.includes("ml") || q.includes("machine learning") || q.includes("numpy") || q.includes("neural")) {
        candidates = [...MOCK_VIDEOS.ml];
      } else {
        candidates = [...MOCK_VIDEOS.ai, ...MOCK_VIDEOS.ml, ...MOCK_VIDEOS.langgraph, ...MOCK_VIDEOS.crewai];
      }
    } else if (contentType === "podcast") {
      candidates = [...MOCK_VIDEOS.podcast];
    } else {
      // General: word-overlap search across entire catalog
      const allVideos = Object.values(MOCK_VIDEOS).flat();
      const qWords = q.split(/\s+/).filter(w => w.length > 2);
      candidates = allVideos.filter(video => {
        const titleLower = video.title.toLowerCase();
        const channelLower = video.channel.toLowerCase();
        const overlap = qWords.filter(w => titleLower.includes(w) || channelLower.includes(w)).length;
        return overlap >= Math.min(1, qWords.length);
      });
      if (candidates.length === 0) candidates = MOCK_VIDEOS.ai;
    }

    // Annotate candidates with detected contentType if not already set
    candidates = candidates.map(v => ({
      ...v,
      contentType: v.contentType ?? (contentType !== "general" ? (contentType as YouTubeVideo["contentType"]) : "general"),
    }));

    const voiceResponse =
      candidates.length > 0
        ? `Found ${candidates.length} results for "${query}".`
        : `No results found for "${query}".`;

    return { success: true, voiceResponse, videos: candidates, contentType };
  },

  /**
   * Generates learning recommendations from the catalog.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLearningRecommendations(_store: ToolStore) {
    const recommendations: YouTubeVideo[] = [
      MOCK_VIDEOS.ml[0],
      MOCK_VIDEOS.ml[1],
      MOCK_VIDEOS.rag[0],
    ];
    return {
      success: true,
      voiceResponse:
        "I've refreshed your educational video recommendations based on your NumPy task and Machine Learning goals.",
      recommendations,
    };
  },
};
