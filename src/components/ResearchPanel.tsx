"use client";

import { useState } from "react";
import { type ToolStore } from "@/lib/tools";

interface ResearchPanelProps {
  store: ToolStore;
  onUploadSimulate: (fileName: string) => void;
  isBusy: boolean;
}

export function ResearchPanel({ store, onUploadSimulate, isBusy }: ResearchPanelProps) {
  const papers = store.researchPapers || [];
  const comparisons = store.comparisons || [];

  const [activePaperId, setActivePaperId] = useState<string | null>(papers[0]?.id || null);
  const [activeCompId, setActiveCompId] = useState<string | null>(comparisons[0]?.id || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const activePaper = papers.find(p => p.id === activePaperId) || papers[0];
  const activeComp = comparisons.find(c => c.id === activeCompId) || comparisons[0];

  const handleSimulatedUpload = () => {
    if (isBusy || uploadProgress !== null) return;
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onUploadSimulate("Attention Is All You Need.pdf");
            setUploadProgress(null);
          }, 400);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  return (
    <div className="panel-enter flex flex-col gap-4" style={{ height: "100%" }}>
      {/* Upload Zone */}
      <div
        className="panel-card"
        style={{
          padding: "16px",
          border: dragActive ? "2px dashed hsl(220, 80%, 55%)" : "1px dashed var(--border-soft)",
          background: dragActive ? "hsl(220, 80%, 55%, 0.03)" : "var(--bg-2)",
          textAlign: "center",
          cursor: isBusy ? "not-allowed" : "pointer",
          transition: "all var(--dur-micro) var(--ease-out)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleSimulatedUpload(); }}
        onClick={handleSimulatedUpload}
      >
        {uploadProgress !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Analyzing Document...</span>
            <div className="progress-track" style={{ maxWidth: "200px" }}>
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "14px" }}>📄</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
              Drag & Drop PDF or Click to Simulate Upload
            </span>
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              Supports academic papers, APIs, & technical docs
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", flex: 1, minHeight: 0 }}>
        {/* Left Side: Papers List & Analysis details */}
        <div className="panel-card flex flex-col" style={{ padding: "14px", overflowY: "auto" }}>
          <span className="label-system" style={{ marginBottom: "10px" }}>Research Paper Intelligence</span>
          {papers.length === 0 ? (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
              {"No papers analyzed yet. Upload a PDF or say \"Analyze the Attention paper\"."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
              {/* Select paper tab */}
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                {papers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePaperId(p.id)}
                    className="btn-system"
                    style={{
                      fontSize: "9px",
                      padding: "3px 8px",
                      background: activePaper?.id === p.id ? "var(--bg-4)" : "var(--bg-2)",
                      borderColor: activePaper?.id === p.id ? "var(--border-strong)" : "var(--border-soft)",
                    }}
                  >
                    {p.title.slice(0, 16)}...
                  </button>
                ))}
              </div>

              {/* Active Paper Details */}
              {activePaper && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", overflowY: "auto", flex: 1 }}>
                  <div>
                    <h4 style={{ fontSize: "13px", margin: "0 0 2px 0", color: "var(--text-primary)", fontWeight: 600 }}>
                      {activePaper.title}
                    </h4>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Authors: {activePaper.authors}</span>
                  </div>
                  
                  <div style={{ background: "var(--bg-base)", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Summary:</span> {activePaper.summary}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div style={{ background: "var(--bg-3)", padding: "6px", borderRadius: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Contributions:</span>
                      <p style={{ margin: "2px 0 0 0" }}>{activePaper.keyContributions}</p>
                    </div>
                    <div style={{ background: "var(--bg-3)", padding: "6px", borderRadius: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Methodology:</span>
                      <p style={{ margin: "2px 0 0 0" }}>{activePaper.methodology}</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div style={{ background: "var(--bg-3)", padding: "6px", borderRadius: "4px", borderLeft: "3px solid hsl(142, 55%, 40%)" }}>
                      <span style={{ fontWeight: 600, color: "hsl(142, 65%, 55%)" }}>Strengths:</span>
                      <p style={{ margin: "2px 0 0 0" }}>{activePaper.strengths}</p>
                    </div>
                    <div style={{ background: "var(--bg-3)", padding: "6px", borderRadius: "4px", borderLeft: "3px solid hsl(0, 60%, 48%)" }}>
                      <span style={{ fontWeight: 600, color: "hsl(0, 70%, 60%)" }}>Weaknesses:</span>
                      <p style={{ margin: "2px 0 0 0" }}>{activePaper.weaknesses}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-3)", padding: "6px", borderRadius: "4px" }}>
                    <span>Implementation Difficulty:</span>
                    <span className="badge badge--system" style={{ borderColor: "hsl(220, 80%, 55%)", color: "hsl(220, 80%, 68%)" }}>
                      {activePaper.implementationDifficulty}
                    </span>
                  </div>

                  <div style={{ background: "hsl(220, 80%, 55%, 0.03)", padding: "8px", borderRadius: "4px", border: "1px dashed hsl(220, 80%, 55%, 0.2)" }}>
                    <span style={{ fontWeight: 600, color: "hsl(220, 80%, 68%)" }}>Actionable Insights:</span> {activePaper.actionableInsights}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Framework Comparisons */}
        <div className="panel-card flex flex-col" style={{ padding: "14px", overflowY: "auto" }}>
          <span className="label-system" style={{ marginBottom: "10px" }}>Framework Comparison Matrix</span>
          {comparisons.length === 0 ? (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
              {"No comparisons generated. Say \"Compare PyTorch vs TensorFlow\" to create a comparison."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
              {/* Select comparison */}
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                {comparisons.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCompId(c.id)}
                    className="btn-system"
                    style={{
                      fontSize: "9px",
                      padding: "3px 8px",
                      background: activeComp?.id === c.id ? "var(--bg-4)" : "var(--bg-2)",
                      borderColor: activeComp?.id === c.id ? "var(--border-strong)" : "var(--border-soft)",
                    }}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {/* Active Comparison Matrix */}
              {activeComp && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px", overflowY: "auto", flex: 1 }}>
                  <h4 style={{ fontSize: "12px", margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                    {activeComp.title} Architecture Comparison
                  </h4>

                  {/* Grid Table */}
                  <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "var(--bg-base)", padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
                      <span>Metric</span>
                      <span>{activeComp.items[0]}</span>
                      <span>{activeComp.items[1]}</span>
                    </div>
                    {activeComp.table.map((row, index) => (
                      <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 8px", background: index % 2 === 1 ? "var(--bg-3)" : "transparent", borderBottom: index < activeComp.table.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{row.metric}</span>
                        <span>{row.values[0]}</span>
                        <span>{row.values[1]}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Summary:</span> {activeComp.summary}
                  </p>

                  <div style={{ background: "hsl(142, 55%, 40%, 0.05)", padding: "8px", borderRadius: "4px", border: "1px solid hsl(142, 55%, 40%, 0.2)", color: "hsl(142, 55%, 70%)" }}>
                    <span style={{ fontWeight: 600 }}>Recommendation:</span> {activeComp.recommendation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
