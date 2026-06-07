"use client";

import { useEffect, useRef } from "react";
import type { AppState } from "@/app/page";
import type { AgentMode } from "@/app/api/agent/route";
import { MODES } from "./ModeSelector";

interface VoiceControlCoreProps {
  appState: AppState;
  supported: boolean;
  isBusy: boolean;
  toggleListening: () => void;
  textInput: string;
  setTextInput: (val: string) => void;
  handleTextKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTextSubmit: () => void;
  activeMode: AgentMode;
  interimTranscript?: string;
}

/* ─── State Configuration Map ─────────────────────────────────
   Single source of truth for all voice-state → visual mappings.
   No conditional styling scattered through JSX.
──────────────────────────────────────────────────────────────── */
const STATE_CONFIG: Record<
  AppState,
  {
    label: string;
    sublabel: string;
    orbBg: string;
    ringColor: string;
    ringMode: "none" | "pulse" | "rotate" | "steady" | "flash";
    waveColor: string;
    waveActive: boolean;
    dotColor: string;
  }
> = {
  idle: {
    label: "IDLE",
    sublabel: "Press Space or click to speak",
    orbBg: "var(--state-idle-bg)",
    ringColor: "transparent",
    ringMode: "none",
    waveColor: "var(--border-mid)",
    waveActive: false,
    dotColor: "var(--border-mid)",
  },
  listening: {
    label: "LISTENING",
    sublabel: "Speak now — release to send",
    orbBg: "var(--state-listen-bg)",
    ringColor: "var(--state-listen-ring)",
    ringMode: "pulse",
    waveColor: "var(--state-listen-ring)",
    waveActive: true,
    dotColor: "var(--state-listen-ring)",
  },
  thinking: {
    label: "PROCESSING",
    sublabel: "Routing to agent",
    orbBg: "var(--state-think-bg)",
    ringColor: "var(--state-think-ring)",
    ringMode: "rotate",
    waveColor: "var(--border-mid)",
    waveActive: false,
    dotColor: "var(--state-think-ring)",
  },
  speaking: {
    label: "SPEAKING",
    sublabel: 'Click or say "stop" to interrupt',
    orbBg: "var(--state-speak-bg)",
    ringColor: "var(--state-speak-ring)",
    ringMode: "steady",
    waveColor: "var(--state-speak-ring)",
    waveActive: true,
    dotColor: "var(--state-speak-ring)",
  },
  interrupted: {
    label: "INTERRUPTED",
    sublabel: "Session cut — ready for next input",
    orbBg: "var(--state-interrupt-bg)",
    ringColor: "var(--state-interrupt-ring)",
    ringMode: "flash",
    waveColor: "var(--border-mid)",
    waveActive: false,
    dotColor: "var(--state-interrupt-ring)",
  },
  paused: {
    label: "PAUSED",
    sublabel: 'Say "continue" or "resume"',
    orbBg: "var(--state-pause-bg)",
    ringColor: "var(--state-pause-ring)",
    ringMode: "steady",
    waveColor: "var(--border-mid)",
    waveActive: false,
    dotColor: "var(--state-pause-ring)",
  },
};

/* ─── Waveform ─────────────────────────────────────────────────
   12 bars with staggered animation delays.
   Heights define the "shape" of the wave at rest.
──────────────────────────────────────────────────────────────── */
const WAVE_BARS = [3, 5, 8, 6, 10, 7, 4, 9, 6, 5, 8, 4];

function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className="flex items-center justify-center gap-[3px]"
      style={{ height: "28px" }}
      aria-hidden="true"
    >
      {WAVE_BARS.map((h, i) => {
        const delay = `${(i * 0.05).toFixed(2)}s`;
        const maxH = h * 2.2;
        return (
          <div
            key={i}
            className={`waveform-bar${active ? " wave-bar--active" : ""}`}
            style={
              {
                height: `${maxH}px`,
                "--wave-delay": delay,
                "--wave-color": color,
                "--wave-dur": `${0.45 + (i % 4) * 0.08}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/* ─── State Ring ───────────────────────────────────────────────
   A thin SVG ring around the orb — animated per voice state.
──────────────────────────────────────────────────────────────── */
function StateRing({
  mode,
  color,
  size,
}: {
  mode: "none" | "pulse" | "rotate" | "steady" | "flash";
  color: string;
  size: number;
}) {
  if (mode === "none") return null;

  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;

  const ringEl = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={mode === "rotate" ? 1.5 : 1}
        strokeDasharray={mode === "rotate" ? `${circ * 0.25} ${circ * 0.75}` : undefined}
        strokeLinecap="round"
        opacity={mode === "steady" ? 0.55 : 0.8}
        style={{
          transition: `stroke var(--dur-state) var(--ease-inout), opacity var(--dur-state) var(--ease-inout)`,
        }}
      />
    </svg>
  );

  if (mode === "pulse") {
    return (
      <div className="absolute inset-0 ring--listening" style={{ borderRadius: "50%" }}>
        {ringEl}
      </div>
    );
  }

  if (mode === "rotate") {
    return (
      <div className="absolute inset-0 ring--thinking" style={{ borderRadius: "50%" }}>
        {ringEl}
      </div>
    );
  }

  if (mode === "flash") {
    return (
      <div className="absolute inset-0 state--interrupted" style={{ borderRadius: "50%" }}>
        {ringEl}
      </div>
    );
  }

  // steady
  return (
    <div className="absolute inset-0" style={{ borderRadius: "50%" }}>
      {ringEl}
    </div>
  );
}

/* ─── Orb Icon ─────────────────────────────────────────────────
   Clean SVG icons — no emoji. Each state has its own icon.
──────────────────────────────────────────────────────────────── */
function OrbIcon({ state }: { state: AppState }) {
  const props = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    color: "rgba(255,255,255,0.75)",
  };

  if (state === "listening") {
    return (
      <svg {...props}>
        {/* Mic body */}
        <rect
          x="9"
          y="3"
          width="6"
          height="11"
          rx="3"
          fill="rgba(255,255,255,0.75)"
          stroke="none"
        />
        {/* Mic stand */}
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    );
  }

  if (state === "thinking") {
    return (
      <svg {...props} color="rgba(255,255,255,0.6)">
        {/* Three dots — processing indicator */}
        <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (state === "speaking") {
    return (
      <svg {...props} color="rgba(255,255,255,0.75)">
        {/* Speaker */}
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );
  }

  if (state === "interrupted") {
    return (
      <svg {...props} color="rgba(255,255,255,0.7)">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }

  if (state === "paused") {
    return (
      <svg {...props} color="rgba(255,255,255,0.65)">
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  // idle — microphone (distinct from listening — no fill)
  return (
    <svg {...props} color="rgba(255,255,255,0.45)">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export function VoiceControlCore({
  appState,
  supported,
  isBusy,
  toggleListening,
  textInput,
  setTextInput,
  handleTextKeyDown,
  handleTextSubmit,
  activeMode,
  interimTranscript = "",
}: VoiceControlCoreProps) {
  const cfg = STATE_CONFIG[appState];
  const prevStateRef = useRef<AppState>(appState);
  const labelKey = useRef(0);

  // Track state changes to re-trigger label animation
  useEffect(() => {
    if (prevStateRef.current !== appState) {
      prevStateRef.current = appState;
      labelKey.current += 1;
    }
  }, [appState]);

  const getModeConfig = (id: AgentMode) => MODES.find((m) => m.id === id) ?? MODES[0];

  const modeConfig = getModeConfig(activeMode);
  const ORB_SIZE = 160;

  return (
    <div
      className="shrink-0 flex flex-col items-center justify-center gap-6 px-6 py-10"
      style={{
        background: "linear-gradient(to bottom, var(--bg-1) 0%, var(--bg-base) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* ── System label ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="label-system">Voice Input Core</span>
        <span
          className="badge badge--system"
          style={{
            color: modeConfig.color,
            borderColor: `${modeConfig.color}30`,
          }}
        >
          {modeConfig.label}
        </span>
      </div>

      {/* ── Interim Transcript ─────────────────────────── */}
      <div
        style={{
          minHeight: "20px",
          opacity: interimTranscript ? 1 : 0,
          transition: "opacity var(--dur-state) var(--ease-inout)",
        }}
      >
        {interimTranscript && (
          <p
            className="text-mono text-center max-w-sm"
            style={{
              color: "var(--state-listen-text)",
              fontStyle: "italic",
            }}
          >
            &ldquo;{interimTranscript}&rdquo;
          </p>
        )}
      </div>

      {/* ── Voice Orb ──────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: ORB_SIZE + 24, height: ORB_SIZE + 24 }}
      >
        {/* Outer ambient glow plane — never decorative, only visible in active states */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              appState !== "idle"
                ? `radial-gradient(circle, ${cfg.ringColor}12 0%, transparent 70%)`
                : "transparent",
            transition: "background var(--dur-state) var(--ease-inout)",
          }}
          aria-hidden="true"
        />

        {/* State ring */}
        <StateRing mode={cfg.ringMode} color={cfg.ringColor} size={ORB_SIZE + 24} />

        {/* Core orb button */}
        <button
          id="voice-orb"
          onClick={toggleListening}
          disabled={appState === "thinking"}
          aria-label={
            appState === "listening"
              ? "Stop listening"
              : appState === "speaking"
                ? "Interrupt speaking"
                : "Start voice input"
          }
          className="orb-bg relative z-10 rounded-full flex items-center justify-center focus-visible:outline-none"
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            background: cfg.orbBg,
            border: `1px solid ${appState !== "idle" ? cfg.ringColor + "40" : "var(--border-subtle)"}`,
            cursor: appState === "thinking" ? "default" : "pointer",
            opacity: appState === "thinking" ? 0.7 : 1,
            boxShadow:
              appState !== "idle" && appState !== "thinking"
                ? `0 0 40px ${cfg.ringColor}14, inset 0 1px 0 rgba(255,255,255,0.04)`
                : "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <OrbIcon state={appState} />
        </button>
      </div>

      {/* ── Status Label ───────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5">
        <span
          key={`state-label-${appState}`}
          className="label-state label-enter"
          style={{ color: appState === "idle" ? "var(--text-muted)" : cfg.dotColor }}
        >
          {cfg.label}
        </span>
        <span
          key={`state-sub-${appState}`}
          className="label-enter"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {!supported ? "Voice input unavailable — use text below" : cfg.sublabel}
        </span>
      </div>

      {/* ── Waveform ───────────────────────────────────── */}
      <div style={{ height: "28px", display: "flex", alignItems: "center" }}>
        <Waveform active={cfg.waveActive} color={cfg.waveColor} />
      </div>

      {/* ── Text Input Console ─────────────────────────── */}
      <div className="w-full" style={{ maxWidth: "440px" }}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 input-base"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          {/* Mode indicator dot */}
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: modeConfig.color,
              flexShrink: 0,
              opacity: 0.7,
            }}
            aria-hidden="true"
          />
          <input
            type="text"
            id="text-command-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder={`Command in ${modeConfig.label} mode…`}
            disabled={isBusy}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-primary)",
              letterSpacing: "0.01em",
            }}
          />
          <button
            id="text-submit-btn"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isBusy}
            aria-label="Send command"
            className="flex items-center justify-center rounded transition-micro"
            style={{
              width: "26px",
              height: "26px",
              background: textInput.trim() && !isBusy ? "hsl(220, 80%, 55%)" : "var(--bg-4)",
              border: "none",
              cursor: textInput.trim() && !isBusy ? "pointer" : "default",
              opacity: !textInput.trim() || isBusy ? 0.3 : 1,
              flexShrink: 0,
              transition:
                "background var(--dur-micro) var(--ease-out), opacity var(--dur-micro) var(--ease-out)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
