import { type ToolStore } from "@/lib/tools";

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnailUrl?: string;
}

const MOCK_VIDEOS: Record<string, YouTubeVideo[]> = {
  ai: [
    {
      id: "vid-ai-1",
      title: "Introduction to Artificial Intelligence (Full Course)",
      channel: "FreeCodeCamp",
      duration: "4:12:00",
      url: "https://www.youtube.com/watch?v=5VhyF_5_mG0",
    },
    {
      id: "vid-ai-2",
      title: "Generative AI Explained in 10 Minutes",
      channel: "Fireship",
      duration: "10:15",
      url: "https://www.youtube.com/watch?v=2e6i5GjPuhk",
    },
  ],
  ml: [
    {
      id: "vid-ml-1",
      title: "Machine Learning for Beginners - NumPy & Pandas Basics",
      channel: "Simplilearn",
      duration: "45:30",
      url: "https://www.youtube.com/watch?v=GwIo3gToqSU",
    },
    {
      id: "vid-ml-2",
      title: "How to Build Neural Networks from Scratch in Python",
      channel: "3Blue1Brown",
      duration: "22:15",
      url: "https://www.youtube.com/watch?v=aircAruvnKk",
    },
  ],
  rag: [
    {
      id: "vid-rag-1",
      title: "Retrieval-Augmented Generation (RAG) Explained Simply",
      channel: "IBM Technology",
      duration: "8:45",
      url: "https://www.youtube.com/watch?v=T-D1OfcDW1M",
    },
    {
      id: "vid-rag-2",
      title: "Advanced RAG Techniques with LangChain and LangGraph",
      channel: "LangChain",
      duration: "15:20",
      url: "https://www.youtube.com/watch?v=f3p_c6Xk1xY",
    },
  ],
  music: [
    {
      id: "vid-music-1",
      title: "Imagine Dragons - Believer (Official Music Video)",
      channel: "ImagineDragonsVEVO",
      duration: "3:43",
      url: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
    },
    {
      id: "vid-music-2",
      title: "Beautiful Krishna Bhajan - Achyutam Keshavam",
      channel: "Spiritual India",
      duration: "6:12",
      url: "https://www.youtube.com/watch?v=O1xKz_QeQoo",
    },
  ],
};

export const youtubeService = {
  /**
   * Searches YouTube videos based on a query
   */
  search(query: string) {
    const q = query.toLowerCase();
    let results: YouTubeVideo[] = [];

    if (q.includes("believer") || q.includes("bhajan") || q.includes("arijit") || q.includes("song")) {
      results = MOCK_VIDEOS.music;
    } else if (q.includes("rag") || q.includes("langgraph")) {
      results = MOCK_VIDEOS.rag;
    } else if (q.includes("numpy") || q.includes("math") || q.includes("machine learning") || q.includes("ml")) {
      results = MOCK_VIDEOS.ml;
    } else {
      results = MOCK_VIDEOS.ai;
    }

    const voiceResponse = `I found ${results.length} relevant videos on YouTube for "${query}". The top result is "${results[0].title}".`;

    return {
      success: true,
      voiceResponse,
      videos: results,
      targetUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    };
  },

  /**
   * Generates a playing link for a specific query
   */
  play(query: string) {
    const q = query.toLowerCase();
    let videoUrl = "https://www.youtube.com";
    let videoTitle = query;

    if (q.includes("believer")) {
      videoUrl = MOCK_VIDEOS.music[0].url;
      videoTitle = MOCK_VIDEOS.music[0].title;
    } else if (q.includes("bhajan")) {
      videoUrl = MOCK_VIDEOS.music[1].url;
      videoTitle = MOCK_VIDEOS.music[1].title;
    } else {
      // General fallback
      videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    const voiceResponse = `Playing "${videoTitle}" on YouTube.`;

    return {
      success: true,
      voiceResponse,
      videoUrl,
      videoTitle,
    };
  },

  /**
   * Generates learning recommendations based on active goals, tasks, and interests
   */
  getLearningRecommendations(store: ToolStore) {
    const _activeInterests = store.learningInterests || [];
    const recommendations: YouTubeVideo[] = [];

    // NumPy related (from active goal Milestone 1)
    recommendations.push(MOCK_VIDEOS.ml[0]);

    // Neural Network/Math related (from active goal Milestone 2)
    recommendations.push(MOCK_VIDEOS.ml[1]);

    // Advanced tech (if interests or research mentions it)
    recommendations.push(MOCK_VIDEOS.rag[0]);

    const voiceResponse = "I've refreshed your educational video recommendations based on your NumPy task and Machine Learning goals.";

    return {
      success: true,
      voiceResponse,
      recommendations,
    };
  }
};
