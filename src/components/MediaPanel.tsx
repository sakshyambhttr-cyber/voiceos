"use client";

import { useState } from "react";
import { type ToolStore } from "@/lib/tools";
import { type YouTubeVideo } from "@/services/youtube";

interface MediaPanelProps {
  store: ToolStore;
  onSearch: (query: string) => void;
  onPlayVideo: (video: YouTubeVideo) => void;
  isBusy: boolean;
}

export function MediaPanel({ store, onSearch, onPlayVideo, isBusy }: MediaPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVideo, setPlayingVideo] = useState<YouTubeVideo | null>({
    id: "vid-music-1",
    title: "Imagine Dragons - Believer (Official Music Video)",
    channel: "ImagineDragonsVEVO",
    duration: "3:43",
    url: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  // Recommendations base
  const recommendations: YouTubeVideo[] = [
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
    {
      id: "vid-rag-1",
      title: "Retrieval-Augmented Generation (RAG) Explained Simply",
      channel: "IBM Technology",
      duration: "8:45",
      url: "https://www.youtube.com/watch?v=T-D1OfcDW1M",
    },
  ];

  return (
    <div className="panel-enter flex flex-col gap-4" style={{ height: "100%" }}>
      {/* YouTube Search Bar */}
      <div className="panel-card" style={{ padding: "12px 14px" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="input-base"
            placeholder="Search YouTube or play videos by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isBusy}
            style={{ flex: 1, padding: "6px 10px", borderRadius: "var(--radius-sm)" }}
          />
          <button type="submit" disabled={isBusy || !searchQuery.trim()} className="btn-system" style={{ fontSize: "11px" }}>
            Search
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", flex: 1, minHeight: 0 }}>
        {/* Left: Recommended educational videos & Search Results */}
        <div className="panel-card flex flex-col" style={{ padding: "14px", overflowY: "auto" }}>
          {store.youtubeSearchResults && store.youtubeSearchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <span className="label-system" style={{ color: "var(--accent)" }}>YouTube Search Results</span>
              <span style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Select a video to play directly
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {store.youtubeSearchResults.map((vid) => (
                  <div
                    key={vid.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-soft)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: "14px" }}>📺</div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
                      <span
                        onClick={() => { setPlayingVideo(vid as YouTubeVideo); onPlayVideo(vid as YouTubeVideo); }}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                        title={vid.title}
                      >
                        {vid.title}
                      </span>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                        {vid.channel} • {vid.duration}
                      </span>
                    </div>
                    <button
                      onClick={() => { setPlayingVideo(vid as YouTubeVideo); onPlayVideo(vid as YouTubeVideo); }}
                      className="btn-system"
                      style={{ padding: "3px 6px", fontSize: "9px" }}
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "10px" }}>
            <span className="label-system">Goal-Oriented Learning Recommendations</span>
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {"Customized learning assets aligned with your \"NumPy\" & \"ML Roadmap\" goals"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recommendations.map((vid) => (
              <div
                key={vid.id}
                style={{
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  transition: "all var(--dur-micro) var(--ease-out)",
                }}
              >
                {/* Simulated Thumbnail */}
                <div
                  style={{
                    width: "60px",
                    height: "40px",
                    borderRadius: "4px",
                    background: "var(--bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  📺
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    onClick={() => { setPlayingVideo(vid); onPlayVideo(vid); }}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                    title={vid.title}
                  >
                    {vid.title}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                    {vid.channel} • {vid.duration}
                  </span>
                </div>
                <button
                  onClick={() => { setPlayingVideo(vid); onPlayVideo(vid); }}
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: "10px" }}
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Media Player Simulation */}
        <div className="panel-card flex flex-col justify-between" style={{ padding: "14px" }}>
          <div>
            <span className="label-system" style={{ marginBottom: "10px" }}>Media Playback Controller</span>
            {playingVideo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                {/* Simulated player screen */}
                <div
                  style={{
                    width: "100%",
                    height: "120px",
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, #1f1f1f 0%, #111 100%)",
                    border: "1px solid var(--border-soft)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>🎬</span>
                  <div style={{ position: "absolute", bottom: "8px", left: "8px", right: "8px" }}>
                    <div className="progress-track" style={{ height: "3px" }}>
                      <div className="progress-fill" style={{ width: "40%", background: "red" }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {playingVideo.title}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                    Active Channel: {playingVideo.channel}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "10px" }}>
                No active media playback.
              </p>
            )}
          </div>

          {playingVideo && (
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "14px" }}>
              <button className="btn-ghost" style={{ fontSize: "14px" }}>⏮️</button>
              <button
                className="btn-system"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  padding: 0,
                  borderColor: "var(--border-strong)",
                }}
              >
                ⏸️
              </button>
              <button className="btn-ghost" style={{ fontSize: "14px" }}>⏭️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
