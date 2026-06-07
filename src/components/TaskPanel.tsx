"use client";

import { useState } from "react";
import type { ToolStore } from "@/lib/tools";

interface TaskPanelProps {
  store: ToolStore;
  onDeleteTask: (taskId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

/* ── Due date badge logic ──────────────────────────────────── */
function dueDateStyle(dueDate: string): { color: string; bg: string; border: string } {
  const d = dueDate.toLowerCase();
  if (d === "today" || d === "overdue" || d.includes("ago")) {
    return {
      color: "hsl(38, 80%, 58%)",
      bg: "hsl(38, 80%, 55%, 0.1)",
      border: "hsl(38, 80%, 55%, 0.2)",
    };
  }
  if (d.includes("tomorrow") || d.includes("1 day")) {
    return {
      color: "hsl(38, 70%, 62%)",
      bg: "hsl(38, 70%, 55%, 0.08)",
      border: "hsl(38, 70%, 55%, 0.18)",
    };
  }
  return {
    color: "var(--text-muted)",
    bg: "var(--bg-3)",
    border: "var(--border-soft)",
  };
}

/* ── Empty Slot ─────────────────────────────────────────────── */
function EmptySlot({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: "11px",
        color: "var(--text-muted)",
        fontStyle: "italic",
        padding: "6px 2px",
      }}
    >
      {label}
    </p>
  );
}

export function TaskPanel({ store, onDeleteTask, onDeleteNote }: TaskPanelProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Tasks ───────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span className="label-system">Active Tasks</span>
          <span className="badge badge--system">{store.tasks.length}</span>
        </div>

        {store.tasks.length === 0 ? (
          <EmptySlot label="No tasks cataloged" />
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {store.tasks.map((task) => {
              const ds = task.dueDate ? dueDateStyle(task.dueDate) : null;
              const isHovered = hoveredTask === task.id;

              return (
                <li
                  key={task.id}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    background: isHovered ? "var(--bg-3)" : "var(--bg-2)",
                    transition: "background var(--dur-micro) var(--ease-out)",
                  }}
                >
                  {/* Bullet */}
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "var(--border-strong)",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />

                  {/* Title */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </span>

                  {/* Due date badge */}
                  {task.dueDate && ds && (
                    <span
                      className="badge"
                      style={{
                        color: ds.color,
                        background: ds.bg,
                        border: `1px solid ${ds.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {task.dueDate}
                    </span>
                  )}

                  {/* Delete — visible on hover only */}
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    aria-label={`Delete task: ${task.title}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      opacity: isHovered ? 1 : 0,
                      transition:
                        "opacity var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out)",
                      flexShrink: 0,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(0, 60%, 55%)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <line
                        x1="1"
                        y1="1"
                        x2="11"
                        y2="11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="11"
                        y1="1"
                        x2="1"
                        y2="11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Notes ───────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span className="label-system">Session Notes</span>
          <span className="badge badge--system">{store.notes.length}</span>
        </div>

        {store.notes.length === 0 ? (
          <EmptySlot label="No notes this session" />
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {store.notes
              .slice()
              .reverse()
              .map((note) => {
                const isHovered = hoveredNote === note.id;
                return (
                  <li
                    key={note.id}
                    onMouseEnter={() => setHoveredNote(note.id)}
                    onMouseLeave={() => setHoveredNote(null)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: isHovered ? "var(--bg-3)" : "var(--bg-2)",
                      transition: "background var(--dur-micro) var(--ease-out)",
                    }}
                  >
                    {/* Note icon */}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ flexShrink: 0, marginTop: "2px" }}
                      aria-hidden="true"
                    >
                      <rect
                        x="1"
                        y="1"
                        width="10"
                        height="10"
                        rx="1.5"
                        stroke="var(--border-strong)"
                        strokeWidth="1"
                      />
                      <line
                        x1="3"
                        y1="4"
                        x2="9"
                        y2="4"
                        stroke="var(--border-strong)"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                      <line
                        x1="3"
                        y1="6.5"
                        x2="9"
                        y2="6.5"
                        stroke="var(--border-strong)"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                      <line
                        x1="3"
                        y1="9"
                        x2="6.5"
                        y2="9"
                        stroke="var(--border-strong)"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>

                    <p
                      style={{
                        flex: 1,
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {note.content}
                    </p>

                    {/* Delete — visible on hover only */}
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      aria-label="Delete note"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        opacity: isHovered ? 1 : 0,
                        transition:
                          "opacity var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out)",
                        flexShrink: 0,
                        padding: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(0, 60%, 55%)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <line
                          x1="1"
                          y1="1"
                          x2="11"
                          y2="11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <line
                          x1="11"
                          y1="1"
                          x2="1"
                          y2="11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
