"use client";

import { useState } from "react";

export interface FeedItem {
  id: string;
  timestamp: Date;
  type: "system" | "user" | "assistant" | "tool" | "council";
  label: string;
  content: string;
  meta?: Record<string, unknown>;
}

interface CommandFeedProps {
  chronologicalFeed: FeedItem[];
}

const FEED_PREVIEW_COUNT = 6;

/* ── Type → badge class mapping ────────────────────────────── */
function feedBadgeClass(type: FeedItem["type"]): string {
  if (type === "tool") return "badge badge--tool";
  if (type === "user") return "badge badge--user";
  if (type === "assistant") return "badge badge--agent";
  if (type === "council") return "badge badge--council";
  return "badge badge--system";
}

/* ── Timeline connector dot ────────────────────────────────── */
function TypeDot({ type }: { type: FeedItem["type"] }) {
  let color = "var(--border-mid)";
  if (type === "tool") color = "hsl(220, 80%, 55%)";
  if (type === "user") color = "hsl(260, 60%, 60%)";
  if (type === "assistant") color = "hsl(142, 55%, 45%)";
  if (type === "council") color = "hsl(38, 80%, 52%)";

  return (
    <span
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginTop: "4px",
      }}
      aria-hidden="true"
    />
  );
}

export function CommandFeed({ chronologicalFeed }: CommandFeedProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? chronologicalFeed : chronologicalFeed.slice(0, FEED_PREVIEW_COUNT);

  const hasMore = chronologicalFeed.length > FEED_PREVIEW_COUNT;

  return (
    <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="label-system">Activity Log</span>
        {chronologicalFeed.length > 0 && (
          <span className="badge badge--system">{chronologicalFeed.length}</span>
        )}
      </div>

      {/* Empty state */}
      {chronologicalFeed.length === 0 && (
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontStyle: "italic",
            padding: "4px 2px",
          }}
        >
          No session activity recorded.
        </p>
      )}

      {/* Feed items — timeline style */}
      {visible.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            position: "relative",
          }}
        >
          {/* Timeline line */}
          <div
            style={{
              position: "absolute",
              left: "5px",
              top: "8px",
              bottom: "8px",
              width: "1px",
              background: "var(--border-subtle)",
            }}
            aria-hidden="true"
          />

          {visible.map((item, idx) => (
            <div
              key={item.id}
              className={idx === 0 ? "panel-enter" : undefined}
              style={{
                display: "flex",
                gap: "10px",
                paddingLeft: "4px",
                paddingBottom: "8px",
              }}
            >
              {/* Dot */}
              <TypeDot type={item.type} />

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {/* Row: label + timestamp */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span className={feedBadgeClass(item.type)}>{item.label}</span>
                  <span
                    className="text-mono"
                    style={{ fontSize: "9px", color: "var(--text-muted)", flexShrink: 0 }}
                  >
                    {item.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Content text — truncated */}
                <p
                  style={
                    {
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      margin: 0,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    } as React.CSSProperties
                  }
                >
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more / less toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="btn-ghost"
          style={{
            width: "100%",
            justifyContent: "center",
            fontSize: "10px",
            padding: "6px",
            borderColor: "var(--border-subtle)",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform var(--dur-micro) var(--ease-out)",
            }}
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {expanded ? "Show less" : `Show ${chronologicalFeed.length - FEED_PREVIEW_COUNT} more`}
        </button>
      )}
    </div>
  );
}
