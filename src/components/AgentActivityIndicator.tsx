import type { CouncilResult, AgentProgressEvent } from "@/lib/council/types";

interface AgentActivityIndicatorProps {
  lastCouncil: CouncilResult | null;
  councilProgress: AgentProgressEvent[];
}

const AGENTS = ["Planner", "Researcher", "Critic", "Executor", "Synthesizer"] as const;

function AgentStatusDot({ status }: { status: string }) {
  let color = "var(--border-mid)"; // pending
  if (status === "done") color = "hsl(142, 55%, 48%)";
  if (status === "running") color = "hsl(38, 80%, 55%)";
  if (status === "error") color = "hsl(0, 60%, 50%)";

  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        transition: "background var(--dur-state) var(--ease-inout)",
      }}
      aria-hidden="true"
    />
  );
}

export function AgentActivityIndicator({
  lastCouncil,
  councilProgress,
}: AgentActivityIndicatorProps) {
  if (!lastCouncil) return null;

  return (
    <div
      className="panel-enter"
      style={{
        padding: "14px",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
        background: "var(--bg-1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span className="label-system" style={{ color: "hsl(220, 80%, 65%)" }}>
          Council Decision
        </span>
        <span
          className="badge badge--tool"
          style={{ fontFamily: "var(--font-mono)", fontSize: "9px" }}
        >
          {(lastCouncil.totalDurationMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Agent status table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        {AGENTS.map((agentName) => {
          const events = councilProgress.filter((e) => e.agent === agentName);
          const latest = events[events.length - 1];
          const status = latest?.status ?? "pending";

          return (
            <div
              key={agentName}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "5px 8px",
                borderRadius: "var(--radius-sm)",
                background: status === "running" ? "var(--bg-3)" : "transparent",
                transition: "background var(--dur-state) var(--ease-inout)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <AgentStatusDot status={status} />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: status === "done" ? "var(--text-secondary)" : "var(--text-primary)",
                  }}
                >
                  {agentName}
                </span>
              </div>
              <span
                className="text-mono"
                style={{
                  fontSize: "9px",
                  color:
                    status === "done"
                      ? "hsl(142, 55%, 48%)"
                      : status === "running"
                        ? "hsl(38, 80%, 55%)"
                        : status === "error"
                          ? "hsl(0, 60%, 50%)"
                          : "var(--text-muted)",
                }}
              >
                {status.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Synthesis result */}
      {lastCouncil.outputs.synthesizer && (
        <div
          style={{
            padding: "10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-base)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "7px",
          }}
        >
          <span
            className="label-system"
            style={{
              color: "hsl(220, 80%, 65%)",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "5px",
            }}
          >
            Synthesis
          </span>
          {[
            { key: "Strategy", value: lastCouncil.outputs.synthesizer.strategy },
            { key: "Risk", value: lastCouncil.outputs.synthesizer.topRisk },
            { key: "Next", value: lastCouncil.outputs.synthesizer.nextStep },
          ].map(({ key, value }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="label-system" style={{ fontSize: "9px" }}>
                {key}
              </span>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
