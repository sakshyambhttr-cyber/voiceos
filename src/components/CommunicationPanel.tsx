"use client";

import { type ToolStore } from "@/lib/tools";

interface CommunicationPanelProps {
  store: ToolStore;
  onSendConfirm: (confirm: boolean) => void;
  isBusy: boolean;
}

export function CommunicationPanel({ store, onSendConfirm, isBusy }: CommunicationPanelProps) {
  const emails = store.emails || [];
  const drafts = store.drafts || [];
  const pendingAction = store.pendingAction;

  const isPendingEmail = pendingAction && pendingAction.type === "sendEmail";

  return (
    <div className="panel-enter flex flex-col gap-4" style={{ height: "100%" }}>
      {/* Pending Action Banner */}
      {isPendingEmail && (
        <div
          className="panel-card"
          style={{
            borderColor: "hsl(38, 75%, 48%)",
            background: "hsl(38, 75%, 48%, 0.08)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "hsl(38, 85%, 60%)", fontSize: "14px", fontWeight: "bold" }}>⚠️</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              Confirmation Required: Send Email?
            </span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {pendingAction.description}. The system will not send emails automatically.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onSendConfirm(true)}
              disabled={isBusy}
              className="btn-system"
              style={{
                background: "hsl(142, 55%, 40%)",
                borderColor: "hsl(142, 55%, 40%)",
                color: "white",
                fontSize: "10px",
                padding: "4px 10px",
              }}
            >
              Confirm Send
            </button>
            <button
              onClick={() => onSendConfirm(false)}
              disabled={isBusy}
              className="btn-ghost"
              style={{ fontSize: "10px", padding: "4px 10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drafts Section */}
      <div className="panel-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <span className="label-system">Active Drafts ({drafts.length})</span>
        {drafts.length === 0 ? (
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
            {"No active drafts. Say \"Draft a follow-up email\" to create one."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                style={{
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>To: {draft.to}</span>
                  <span className="text-mono" style={{ fontSize: "9px" }}>Staged Draft</span>
                </div>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", margin: 0 }}>
                  Subject: {draft.subject}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineBreak: "anywhere" }}>
                  {draft.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inbox List */}
      <div className="panel-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label-system">Gmail Inbox ({emails.length})</span>
          <span className="badge badge--system" style={{ fontSize: "9px" }}>
            {emails.filter((e) => e.unread).length} Unread
          </span>
        </div>

        {emails.length === 0 ? (
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
            Your inbox is empty.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {emails.map((email) => (
              <div
                key={email.id}
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  background: email.unread ? "hsl(220, 80%, 55%, 0.03)" : "var(--bg-base)",
                  border: `1px solid ${email.unread ? "var(--border-strong)" : "var(--border-subtle)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all var(--dur-micro) var(--ease-out)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {email.unread && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "hsl(220, 80%, 55%)",
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-primary)" }}>
                      {email.sender}
                    </span>
                  </div>
                  <span className={`badge badge--${email.priority}`}>{email.priority}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)" }}>
                    {email.subject}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {email.date}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                  {email.body}
                </p>
                <div
                  style={{
                    padding: "6px 8px",
                    background: "var(--bg-2)",
                    borderRadius: "4px",
                    fontSize: "10px",
                    color: "hsl(142, 55%, 55%)",
                    border: "1px dashed var(--border-soft)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Summary:</span> {email.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
