import type { AgentMode } from "@/app/api/agent/route";

export const MODES: {
  id: AgentMode;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "general",
    label: "General",
    description: "Daily assistant",
    color: "hsl(220, 80%, 60%)",
    icon: null, // set below
  },
  {
    id: "planner",
    label: "Planner",
    description: "Schedules & tasks",
    color: "hsl(142, 55%, 48%)",
    icon: null,
  },
  {
    id: "tutor",
    label: "Tutor",
    description: "Learn step-by-step",
    color: "hsl(38, 80%, 55%)",
    icon: null,
  },
  {
    id: "research",
    label: "Research",
    description: "Analyse & compare",
    color: "hsl(270, 55%, 60%)",
    icon: null,
  },
];

/* ── Mode SVG Icons (geometric, no emoji) ──────────────────── */
function IconGeneral({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" fill={color} />
    </svg>
  );
}

function IconPlanner({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke={color} strokeWidth="1.5" />
      <line x1="5" y1="6" x2="11" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="9" x2="9" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTutor({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5" />
      <path
        d="M3 13c0-2.761 2.239-4 5-4s5 1.239 5 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconResearch({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" />
      <line
        x1="10.5"
        y1="10.5"
        x2="13.5"
        y2="13.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const MODE_ICONS: Record<AgentMode, (color: string) => React.ReactNode> = {
  general: (c) => <IconGeneral color={c} />,
  planner: (c) => <IconPlanner color={c} />,
  tutor: (c) => <IconTutor color={c} />,
  research: (c) => <IconResearch color={c} />,
};

/* ── Component ─────────────────────────────────────────────── */
interface ModeSelectorProps {
  activeMode: AgentMode;
  onSelect: (mode: AgentMode) => void;
  disabled: boolean;
}

export function ModeSelector({ activeMode, onSelect, disabled }: ModeSelectorProps) {
  return (
    <div
      style={{
        padding: "var(--space-md)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}
    >
      <span className="label-system" style={{ display: "block", marginBottom: "10px" }}>
        Cognitive Mode
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {MODES.map((mode) => {
          const isActive = mode.id === activeMode;
          return (
            <button
              key={mode.id}
              id={`mode-btn-${mode.id}`}
              onClick={() => onSelect(mode.id)}
              disabled={disabled}
              aria-pressed={isActive}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: isActive ? `1px solid ${mode.color}35` : "1px solid transparent",
                background: isActive ? `${mode.color}0f` : "transparent",
                borderLeft: isActive ? `2px solid ${mode.color}` : "2px solid transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
                textAlign: "left",
                transition:
                  "background var(--dur-micro) var(--ease-out), border-color var(--dur-micro) var(--ease-out), opacity var(--dur-micro) var(--ease-out)",
              }}
            >
              {/* Icon */}
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                {MODE_ICONS[mode.id](isActive ? mode.color : "var(--text-muted)")}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                  lineHeight: 1,
                  transition: "color var(--dur-micro) var(--ease-out)",
                }}
              >
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
