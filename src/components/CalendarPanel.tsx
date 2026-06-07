"use client";

import { type ToolStore } from "@/lib/tools";

interface CalendarPanelProps {
  store: ToolStore;
  onEventConfirm: (confirm: boolean) => void;
  isBusy: boolean;
}

export function CalendarPanel({ store, onEventConfirm, isBusy }: CalendarPanelProps) {
  const events = store.calendarEvents || [];
  const pendingAction = store.pendingAction;
  
  const isPendingEvent = pendingAction && pendingAction.type === "createEvent";

  // Today's Date representation in mock environment: June 7, 2026
  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatEventDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="panel-enter flex flex-col gap-4" style={{ height: "100%" }}>
      {/* Pending Event Action Confirmation Banner */}
      {isPendingEvent && (
        <div
          className="panel-card"
          style={{
            borderColor: "hsl(220, 80%, 55%)",
            background: "hsl(220, 80%, 55%, 0.08)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "hsl(220, 80%, 65%)", fontSize: "14px", fontWeight: "bold" }}>📅</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              Confirm Calendar Event
            </span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {pendingAction.description}.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onEventConfirm(true)}
              disabled={isBusy}
              className="btn-system"
              style={{
                background: "hsl(220, 80%, 55%)",
                borderColor: "hsl(220, 80%, 55%)",
                color: "white",
                fontSize: "10px",
                padding: "4px 10px",
              }}
            >
              Confirm Event
            </button>
            <button
              onClick={() => onEventConfirm(false)}
              disabled={isBusy}
              className="btn-ghost"
              style={{ fontSize: "10px", padding: "4px 10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule Summary (Morning Briefing) */}
      <div className="panel-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <span className="label-system">Morning Briefing Summary</span>
        <div
          style={{
            padding: "12px",
            background: "var(--bg-3)",
            borderRadius: "var(--radius-sm)",
            borderLeft: "3px solid hsl(38, 75%, 48%)",
          }}
        >
          <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
            Welcome back. You have {events.length} events scheduled in total. Your highest priority today is completing your NumPy exercises.
          </p>
        </div>
      </div>

      {/* Events List */}
      <div className="panel-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
        <span className="label-system">Upcoming Schedule ({events.length})</span>
        {events.length === 0 ? (
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
            {"No events scheduled. Say \"Schedule a meeting tomorrow at 4 PM\" to add one."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {events.map((event) => {
              const start = new Date(event.startTime);
              const isToday = start.getDate() === 7 && start.getMonth() === 5 && start.getFullYear() === 2026;
              
              return (
                <div
                  key={event.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: isToday ? "hsl(220, 80%, 55%, 0.02)" : "var(--bg-base)",
                    border: `1px solid ${isToday ? "var(--border-strong)" : "var(--border-subtle)"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all var(--dur-micro) var(--ease-out)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-primary)" }}>
                      {event.title}
                    </span>
                    {event.description && (
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {event.description}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                    <span className="text-mono" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {formatEventTime(event.startTime)}
                    </span>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      {isToday ? "Today" : formatEventDate(event.startTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
