"use client";

import React from "react";

interface DebugPanelProps {
  debugLog: any;
  activeWorkflow: any;
  isVisible: boolean;
  onClose: () => void;
  defaultCalendar?: string;
  providerName?: string;
}

export function DebugPanel({
  debugLog,
  activeWorkflow,
  isVisible,
  onClose,
  defaultCalendar = "Personal",
  providerName = "Mock Calendar",
}: DebugPanelProps) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "380px",
        background: "hsl(220, 25%, 7%)",
        borderLeft: "1px solid hsl(220, 20%, 15%)",
        boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "11px",
        color: "hsl(140, 80%, 75%)",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "hsl(220, 25%, 5%)",
          borderBottom: "1px solid hsl(220, 20%, 12%)",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "hsl(38, 90%, 55%)",
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 600, fontSize: "12px", letterSpacing: "0.05em" }}>DEV_CONSOLE v1.0</span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            color: "hsl(0, 70%, 60%)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
          }}
          aria-label="Close Debug Panel"
        >
          [X]
        </button>
      </div>

      {/* Content Container */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* SECTION 1: Intent Extraction Layer */}
        {debugLog && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "4px", padding: "12px" }}>
            <div style={{ color: "hsl(190, 90%, 70%)", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px", marginBottom: "8px", fontWeight: "bold" }}>
              # INTENT_EXTRACTION_LAYER
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><span style={{ color: "hsl(290, 80%, 80%)" }}>Platform:</span> {debugLog.platform || "null"}</div>
              <div><span style={{ color: "hsl(290, 80%, 80%)" }}>Action:</span> {debugLog.action || "null"}</div>
              <div><span style={{ color: "hsl(290, 80%, 80%)" }}>Extracted Query:</span> &quot;{debugLog.extractedQuery || ""}&quot;</div>
              <div><span style={{ color: "hsl(290, 80%, 80%)" }}>Selected Tool:</span> {debugLog.selectedTool || "none"}</div>
              <div>
                <span style={{ color: "hsl(290, 80%, 80%)" }}>Raw Intent:</span>
                <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "hsl(140, 50%, 60%)", background: "black", padding: "6px", borderRadius: "2px", overflowX: "auto" }}>
                  {JSON.stringify(debugLog.intent || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Workflow Engine State */}
        {activeWorkflow ? (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "4px", padding: "12px" }}>
            <div style={{ color: "hsl(38, 90%, 70%)", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px", marginBottom: "8px", fontWeight: "bold" }}>
              # ACTIVE_WORKFLOW_ENGINE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div><span style={{ color: "hsl(200, 80%, 85%)" }}>Goal:</span> &quot;{activeWorkflow.original_goal}&quot;</div>
              <div>
                <span style={{ color: "hsl(200, 80%, 85%)" }}>Status:</span>{" "}
                <span style={{
                  color: activeWorkflow.status === "completed" ? "hsl(140, 80%, 55%)" :
                         activeWorkflow.status === "failed" ? "hsl(0, 80%, 60%)" :
                         activeWorkflow.status === "waiting_confirmation" ? "hsl(38, 80%, 60%)" : "hsl(200, 80%, 60%)",
                  fontWeight: "bold"
                }}>
                  {activeWorkflow.status.toUpperCase()}
                </span>
              </div>
              
              <div>
                <span style={{ color: "hsl(200, 80%, 85%)" }}>Execution Plan:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                  {activeWorkflow.steps.map((step: any, idx: number) => {
                    const isActive = activeWorkflow.current_step_index === idx;
                    const isCompleted = step.status === "completed";
                    const isFailed = step.status === "failed";
                    
                    let icon = "[ ]";
                    let color = "hsl(0, 0%, 50%)";
                    if (isCompleted) {
                      icon = "[✓]";
                      color = "hsl(140, 80%, 60%)";
                    } else if (isFailed) {
                      icon = "[X]";
                      color = "hsl(0, 80%, 60%)";
                    } else if (isActive && activeWorkflow.status === "waiting_confirmation") {
                      icon = "[?]";
                      color = "hsl(38, 80%, 60%)";
                    } else if (isActive) {
                      icon = "[>]";
                      color = "hsl(200, 80%, 60%)";
                    }
                    
                    return (
                      <div key={idx} style={{ color, display: "flex", gap: "6px", alignItems: "flex-start" }}>
                        <span>{icon}</span>
                        <div>
                          <strong>{step.tool}:</strong> {step.action}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeWorkflow.context.lastResult && (
                <div>
                  <span style={{ color: "hsl(200, 80%, 85%)" }}>Last Step Output:</span>
                  <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "hsl(60, 80%, 70%)", background: "black", padding: "6px", borderRadius: "2px", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {typeof activeWorkflow.context.lastResult === "object"
                      ? JSON.stringify(activeWorkflow.context.lastResult, null, 2)
                      : String(activeWorkflow.context.lastResult)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: "hsl(0, 0%, 50%)", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
            No active multi-step workflow in memory.
          </div>
        )}

        {/* SECTION 3: Calendar Provider System */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "4px", padding: "12px" }}>
          <div style={{ color: "hsl(140, 90%, 70%)", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px", marginBottom: "8px", fontWeight: "bold" }}>
            # CALENDAR_INTEGRATION_SYSTEM
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div><span style={{ color: "hsl(60, 80%, 80%)" }}>Default Calendar:</span> {defaultCalendar}</div>
            <div><span style={{ color: "hsl(60, 80%, 80%)" }}>Provider Name:</span> {providerName}</div>
            <div>
              <span style={{ color: "hsl(60, 80%, 80%)" }}>OAuth Token Status:</span>{" "}
              <span style={{ color: providerName === "Google Calendar" ? "hsl(140, 80%, 60%)" : "hsl(38, 80%, 60%)" }}>
                {providerName === "Google Calendar" ? "AUTHENTICATED" : "LOCAL_MOCK"}
              </span>
            </div>
            {activeWorkflow?.context?.eventDetails && (
              <div>
                <span style={{ color: "hsl(60, 80%, 80%)" }}>Extracted Event:</span>
                <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "hsl(140, 80%, 75%)", background: "black", padding: "6px", borderRadius: "2px" }}>
                  {JSON.stringify(activeWorkflow.context.eventDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Footer */}
      <div
        style={{
          padding: "10px 16px",
          background: "hsl(220, 25%, 5%)",
          borderTop: "1px solid hsl(220, 20%, 12%)",
          textAlign: "center",
          fontSize: "9px",
          color: "hsl(0, 0%, 40%)",
        }}
      >
        DEV_MODE // PROCESS_MONITOR
      </div>
    </div>
  );
}
