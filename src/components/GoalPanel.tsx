import type { Goal } from "@/lib/goals/types";

interface GoalPanelProps {
  goals: Goal[];
  handleToggleGoalTask: (goalId: string, milestoneId: string, taskId: string) => void;
}

/* ── Status dot color ─────────────────────────────────────── */
function milestoneStatusColor(status: string): string {
  if (status === "done") return "hsl(142, 55%, 48%)";
  if (status === "in-progress") return "hsl(38, 80%, 55%)";
  return "var(--border-mid)";
}

/* ── Empty State ────────────────────────────────────────────── */
function EmptyGoals() {
  return (
    <div
      style={{
        padding: "32px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        textAlign: "center",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          stroke="var(--border-mid)"
          strokeWidth="1.5"
        />
        <line
          x1="8"
          y1="12"
          x2="16"
          y2="12"
          stroke="var(--border-mid)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="12"
          y1="8"
          x2="12"
          y2="16"
          stroke="var(--border-mid)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="label-system">No active goals</p>
      <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
        Say &quot;create a goal&quot; to start
      </p>
    </div>
  );
}

export function GoalPanel({ goals, handleToggleGoalTask }: GoalPanelProps) {
  if (goals.length === 0) return <EmptyGoals />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {goals.map((goal) => {
        const done = goal.milestones.filter((m) => m.status === "done").length;
        const total = goal.milestones.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <article
            key={goal.id}
            className="panel-card panel-enter"
            style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {goal.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  className="text-mono"
                  style={{ color: "var(--text-muted)", fontSize: "10px" }}
                >
                  {goal.timeline}
                </span>
                <span
                  style={{
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    background: "var(--border-mid)",
                  }}
                  aria-hidden="true"
                />
                <span
                  className="text-mono"
                  style={{ color: "var(--text-muted)", fontSize: "10px" }}
                >
                  {done}/{total} milestones
                </span>
              </div>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span
                className="text-mono"
                style={{ fontSize: "9px", color: "var(--text-muted)", alignSelf: "flex-end" }}
              >
                {pct}% complete
              </span>
            </div>

            {/* Milestones */}
            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {goal.milestones.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Milestone header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: milestoneStatusColor(m.status),
                        flexShrink: 0,
                        transition: "background var(--dur-micro) var(--ease-out)",
                      }}
                      aria-hidden="true"
                    />
                    <span className="label-system" style={{ color: "var(--text-secondary)" }}>
                      {m.title}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      paddingLeft: "12px",
                    }}
                  >
                    {m.tasks.map((t) => (
                      <label
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          cursor: "pointer",
                          userSelect: "none",
                          padding: "2px 0",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => handleToggleGoalTask(goal.id, m.id, t.id)}
                          className="checkbox-system"
                          style={{ marginTop: "1px" }}
                        />
                        <span
                          style={{
                            fontSize: "11px",
                            color: t.done ? "var(--text-muted)" : "var(--text-secondary)",
                            textDecoration: t.done ? "line-through" : "none",
                            lineHeight: 1.4,
                            transition: "color var(--dur-micro) var(--ease-out)",
                          }}
                        >
                          {t.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
