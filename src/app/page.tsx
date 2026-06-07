"use client";

// 1. External packages
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";

// 2. Components
import { ModeSelector, MODES } from "@/components/ModeSelector";
import { GoalPanel } from "@/components/GoalPanel";
import { TaskPanel } from "@/components/TaskPanel";
import { AgentActivityIndicator } from "@/components/AgentActivityIndicator";
import { CommandFeed } from "@/components/CommandFeed";
import { VoiceControlCore } from "@/components/VoiceControlCore";

// 3. Types and local imports
import type { AgentMode, MemoryTurn } from "./api/agent/route";
import type { ToolStore } from "@/lib/tools";
import type { Goal, MilestoneStatus } from "@/lib/goals/types";
import type { CouncilResult, AgentProgressEvent } from "@/lib/council/types";
import type { Recommendation } from "@/lib/recommendations/engine";

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode: AgentMode;
}

export type AppState = "idle" | "listening" | "thinking" | "speaking" | "interrupted" | "paused";

/* â”€â”€â”€ Web Speech API types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function getModeConfig(id: AgentMode) {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
function speechErrorMessage(code: string): { text: string; showTextFallback: boolean } {
  switch (code) {
    case "network":
      return {
        text: "Speech recognition requires internet and Chrome/Edge. Use the text box below.",
        showTextFallback: true,
      };
    case "not-allowed":
    case "permission-denied":
      return {
        text: "Microphone access denied. Allow mic access in your browser settings.",
        showTextFallback: true,
      };
    case "no-speech":
      return {
        text: "No speech detected. Try speaking closer to your mic.",
        showTextFallback: false,
      };
    case "audio-capture":
      return {
        text: "No microphone detected. Connect one or use the text box.",
        showTextFallback: true,
      };
    case "aborted":
      return { text: "", showTextFallback: false };
    case "service-not-allowed":
      return {
        text: "Speech recognition blocked on this page. Use the text box.",
        showTextFallback: true,
      };
    default:
      return { text: `Speech error: ${code}. Try the text box below.`, showTextFallback: true };
  }
}

// Reusable layout components imported from @/components

/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function VoiceAgentOS() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<MemoryTurn[]>([]);
  const [store, setStore] = useState<ToolStore>(() => {
    return {
      tasks: [
        {
          id: "task-elec-exam",
          title: "Prepare for Electronics Exam",
          dueDate: "in 5 days",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "task-numpy",
          title: "Complete NumPy exercises",
          dueDate: "today",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "task-startup-checklist",
          title: "Review Startup MVP features",
          dueDate: "next week",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      notes: [
        {
          id: "note-ml-prioritization",
          content: "I need to complete Milestone 2 before starting Deep Learning.",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "note-elec-details",
          content: "Electronics exam covers chapters 5 to 8.",
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dailyFocus, setDailyFocus] = useState<string>("");
  const [dailyBriefing, setDailyBriefing] = useState<string>("");
  const [briefingTimestamp, setBriefingTimestamp] = useState<Date | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<"goals" | "tasks-notes">("goals");
  const [councilProgress, setCouncilProgress] = useState<AgentProgressEvent[]>([]);
  const [lastCouncil, setLastCouncil] = useState<CouncilResult | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [activeMode, setActiveMode] = useState<AgentMode>("general");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [supported, setSupported] = useState(true);
  const [murfEnabled, setMurfEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("en-US-amara");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const murfEnabledRef = useRef(true);
  // Ref so sendToAgent always reads latest mode without stale closure
  const activeModeRef = useRef<AgentMode>("general");
  // Ref so sendToAgent always reads latest memory without stale closure
  const memoryRef = useRef<MemoryTurn[]>([]);
  // Ref so sendToAgent always reads latest tool store without stale closure
  const storeRef = useRef<ToolStore>({ tasks: [], notes: [] });
  // Interruption System refs
  const interruptionRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isInterruptedRef = useRef(false);
  const playVoiceRef = useRef<((text: string) => Promise<void>) | null>(null);
  const startInterruptionListeningRef = useRef<(() => void) | null>(null);
  const sendToAgentRef = useRef<((text: string) => Promise<void>) | null>(null);

  const isListening = appState === "listening";
  const isThinking = appState === "thinking";
  const isSpeaking = appState === "speaking";
  const isBusy = isThinking || isSpeaking;

  /* â”€â”€â”€ Keep mode ref in sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  /* â”€â”€â”€ Keep memory ref in sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  /* â”€â”€â”€ Keep store ref in sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  /* â”€â”€â”€ Interruption Command Processor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleInterruptionCommand: (rawText: string) => boolean = useCallback(
    (rawText) => {
      const text = rawText.trim().toLowerCase();

      const isStop = /\b(stop|halt|cancel|quiet|shush)\b/.test(text);
      const isPause = /\b(pause|hold on|wait)\b/.test(text);
      const isContinue = /\b(continue|resume|go on|keep going)\b/.test(text);
      const isRepeat = /\b(repeat|say that again|what was that|replay)\b/.test(text);
      const isShorter = /\b(shorter|make it shorter|be brief|summarize briefly)\b/.test(text);
      const isExplainDifferently =
        /\b(explain differently|explain in another way|different explanation|rephrase)\b/.test(
          text
        );
      const isSummarize = /\b(summarize|summary|in short|wrap up)\b/.test(text);

      if (isStop) {
        console.log("[Interruption] Command: STOP");
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setAppState("idle");
        try {
          interruptionRecognitionRef.current?.stop();
        } catch (e) {}
        return true;
      }

      if (isPause) {
        console.log("[Interruption] Command: PAUSE");
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setAppState("paused");
        try {
          interruptionRecognitionRef.current?.stop();
        } catch (e) {}
        return true;
      }

      if (isContinue) {
        console.log("[Interruption] Command: CONTINUE");
        if (audioRef.current && appState === "paused") {
          setAppState("speaking");
          audioRef.current.play().catch(() => setAppState("idle"));
          startInterruptionListeningRef.current?.();
        } else {
          sendToAgentRef.current?.("Please continue where you left off.");
        }
        return true;
      }

      if (isRepeat) {
        console.log("[Interruption] Command: REPEAT");
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setAppState("idle");
        try {
          interruptionRecognitionRef.current?.stop();
        } catch (e) {}

        const assistantMsgs = messages.filter((m) => m.role === "assistant");
        if (assistantMsgs.length > 0) {
          const lastMsg = assistantMsgs[assistantMsgs.length - 1];
          playVoiceRef.current?.(lastMsg.content);
        } else {
          playVoiceRef.current?.("There is no response to repeat.");
        }
        return true;
      }

      if (isShorter || isExplainDifferently || isSummarize) {
        console.log("[Interruption] Command: LLM DIRECTIVE");
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setAppState("thinking");
        try {
          interruptionRecognitionRef.current?.stop();
        } catch (e) {}

        const userMsgs = messages.filter((m) => m.role === "user");
        const lastUserPrompt = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : "";

        let directive = "";
        if (isShorter)
          directive = `Please make your previous response to "${lastUserPrompt}" much shorter and more concise.`;
        else if (isExplainDifferently)
          directive = `Please explain your previous response to "${lastUserPrompt}" differently, using simple language or a different analogy.`;
        else if (isSummarize)
          directive = `Please summarize your previous response to "${lastUserPrompt}" in one sentence.`;

        sendToAgentRef.current?.(directive);
        return true;
      }

      return false;
    },
    [messages, appState]
  );

  /* â”€â”€â”€ Conversational Interruption Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleVoiceInterruption: (text: string) => void = useCallback(
    (text) => {
      if (isInterruptedRef.current) return;

      const isCommand = handleInterruptionCommand(text);
      if (isCommand) {
        isInterruptedRef.current = true;
        return;
      }

      console.log("[Interruption] Conversational interruption:", text);
      isInterruptedRef.current = true;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setAppState("interrupted");
      try {
        interruptionRecognitionRef.current?.stop();
      } catch (e) {}

      setTimeout(() => {
        sendToAgentRef.current?.(text);
      }, 500);
    },
    [handleInterruptionCommand]
  );

  /* â”€â”€â”€ Start Interruption Listening (Mic active during Speak) â”€â”€ */
  const startInterruptionListening: () => void = useCallback(() => {
    if (!supported) return;

    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    try {
      interruptionRecognitionRef.current?.stop();
    } catch (e) {}

    const SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SRConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[Interruption] Started background listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let speech = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        speech += event.results[i][0].transcript;
      }

      const text = speech.trim().toLowerCase();
      if (!text) return;

      console.log("[Interruption] Detected speech:", text);
      handleVoiceInterruption(text);
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      console.log("[Interruption] Background listening ended");
    };

    interruptionRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn("[Interruption] Failed to start:", err);
    }
  }, [supported, handleVoiceInterruption]);

  /* â”€â”€â”€ Play voice via Murf Falcon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const playVoice: (text: string) => Promise<void> = useCallback(
    async (text) => {
      if (!murfEnabledRef.current) return;

      try {
        setAppState("speaking");
        isInterruptedRef.current = false;

        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: selectedVoice }),
        });

        if (res.status === 503) {
          murfEnabledRef.current = false;
          setMurfEnabled(false);
          setAppState("idle");
          return;
        }

        if (!res.ok) {
          console.error("[voice] Murf error", res.status);
          setAppState("idle");
          return;
        }

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current = null;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        startInterruptionListening();

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            try {
              interruptionRecognitionRef.current?.stop();
            } catch (e) {}
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            try {
              interruptionRecognitionRef.current?.stop();
            } catch (e) {}
            resolve();
          };
          audio.play().catch(() => {
            try {
              interruptionRecognitionRef.current?.stop();
            } catch (e) {}
            resolve();
          });
        });
      } catch (err) {
        console.error("[voice]", err);
        try {
          interruptionRecognitionRef.current?.stop();
        } catch (e) {}
      } finally {
        setAppState((curr) => (curr === "speaking" ? "idle" : curr));
      }
    },
    [selectedVoice, startInterruptionListening]
  );

  useEffect(() => {
    playVoiceRef.current = playVoice;
  }, [playVoice]);

  useEffect(() => {
    startInterruptionListeningRef.current = startInterruptionListening;
  }, [startInterruptionListening]);

  /* â”€â”€â”€ Scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, appState]);

  // Fetch goals on startup
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch("/api/goals");
        if (res.ok) {
          const data = await res.json();
          if (data.goals) {
            setGoals(data.goals);
          }
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      }
    };
    fetchGoals();
  }, []);

  // Fetch recommendations whenever goals, tasks/notes, or history updates
  const fetchRecommendations = useCallback(
    async (currentGoals: Goal[], currentStore: ToolStore, currentMemory: MemoryTurn[]) => {
      try {
        setLoadingInsights(true);
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goals: currentGoals, store: currentStore, memory: currentMemory }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.recommendations) setRecommendations(data.recommendations);
          if (data.dailyFocus) setDailyFocus(data.dailyFocus);
          if (data.dailyBriefing) {
            setDailyBriefing(data.dailyBriefing);
            setBriefingTimestamp(new Date());
          }
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setLoadingInsights(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations(goals, store, memory);
    }, 0);
    return () => clearTimeout(timer);
  }, [goals, store, memory, fetchRecommendations]);

  useEffect(() => {
    if (dailyBriefing && !greetingPlayed) {
      const timer = setTimeout(() => {
        setGreetingPlayed(true);
        playVoice(dailyBriefing).catch((err: unknown) => {
          console.warn("Autoplay blocked for greeting speech:", err);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dailyBriefing, greetingPlayed, playVoice]);

  // Handler to toggle goal milestone checklist tasks
  const handleToggleGoalTask = async (goalId: string, milestoneId: string, taskId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id !== milestoneId) return m;

      const updatedTasks = m.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, done: !t.done };
      });

      const allDone = updatedTasks.every((t) => t.done);
      const someDone = updatedTasks.some((t) => t.done);
      const status: MilestoneStatus = allDone ? "done" : someDone ? "in-progress" : "pending";

      return { ...m, tasks: updatedTasks, status };
    });

    const patch: Partial<Goal> = { milestones: updatedMilestones };

    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...patch } : g)));

    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId, patch }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.goal) {
          setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
        }
      }
    } catch (err) {
      console.error("Error patching goal:", err);
    }
  };

  /* â”€â”€â”€ Focus text input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (showTextInput) setTimeout(() => textInputRef.current?.focus(), 50);
  }, [showTextInput]);

  /* â”€â”€â”€ Check speech support â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setTimeout(() => {
        setSupported(false);
        setShowTextInput(true);
      }, 0);
    }
  }, []);

  /* â”€â”€â”€ Handle mode switch â€” clear display + keep memory â”€â”€â”€â”€â”€ */
  const handleModeSelect = useCallback(
    (mode: AgentMode) => {
      if (isBusy) return;
      setActiveMode(mode);
      setMessages([]); // clear display only â€” memory persists across modes
      setError(null);
      setInterimTranscript("");
    },
    [isBusy]
  );

  /* â”€â”€â”€ Send to AI â†’ execute tools â†’ update memory â†’ speak â”€â”€â”€ */
  const sendToAgent: (text: string) => Promise<void> = useCallback(
    async (text) => {
      if (!text.trim()) return;

      const isCommand = handleInterruptionCommand(text);
      if (isCommand) {
        return;
      }

      const mode = activeModeRef.current;
      const currentMemory = memoryRef.current;
      const currentStore = storeRef.current;

      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
        mode,
      };

      setMessages((prev) => [...prev, userMsg].slice(-5));
      setInterimTranscript("");
      setAppState("thinking");
      setError(null);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            mode,
            memory: currentMemory,
            store: currentStore,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const responseText: string = data.response ?? "No response.";
        const toolUsed: string = data.toolUsed ?? "none";

        if (data.updatedStore) {
          setStore(data.updatedStore);
        }

        if (data.goal) {
          setGoals((prev) => {
            const exists = prev.find((g) => g.id === data.goal.id);
            return exists ? prev : [...prev, data.goal];
          });
        }

        if (data.goals) {
          setGoals(data.goals);
        }

        if (toolUsed === "createTask" || toolUsed === "getTasks") {
          setLeftSidebarTab("tasks-notes");
        } else if (toolUsed === "createNote" || toolUsed === "getNotes") {
          setLeftSidebarTab("tasks-notes");
        } else if (toolUsed === "createGoal" || toolUsed === "listGoals") {
          setLeftSidebarTab("goals");
        } else if (toolUsed === "council") {
          if (data.councilResult) {
            setLastCouncil(data.councilResult);
            setCouncilProgress(data.councilResult.agentProgress ?? []);
          }
          setShowRightSidebar(true);
        }

        const aiMsg: Message = {
          id: genId(),
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          mode,
        };

        setMessages((prev) => [...prev, aiMsg].slice(-5));

        if (toolUsed === "none") {
          const newTurn: MemoryTurn = {
            user: text.trim(),
            assistant: responseText,
            mode,
          };
          setMemory((prev) => [...prev, newTurn].slice(-10));
        }

        await playVoice(responseText);
      } catch (err) {
        console.error(err);
        setError("Could not reach the agent. Check your connection.");
        setAppState("idle");
      }
    },
    [playVoice, handleInterruptionCommand]
  );

  useEffect(() => {
    sendToAgentRef.current = sendToAgent;
  }, [sendToAgent]);

  // Helper to start active speech recognition for new prompts
  const startActiveListening = useCallback(() => {
    const SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SRConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    sentRef.current = false;
    finalTranscriptRef.current = "";

    recognition.onstart = () => {
      setAppState("listening");
      setError(null);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) setInterimTranscript(interim);
      if (final) {
        finalTranscriptRef.current = final;
        setInterimTranscript(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const { text, showTextFallback } = speechErrorMessage(event.error);
      if (text) setError(text);
      if (showTextFallback) setShowTextInput(true);
      sentRef.current = true;
      setAppState("idle");
      setInterimTranscript("");
    };

    recognition.onend = () => {
      if (!sentRef.current && finalTranscriptRef.current.trim()) {
        sentRef.current = true;
        const captured = finalTranscriptRef.current.trim();
        finalTranscriptRef.current = "";
        sendToAgent(captured);
      } else {
        setAppState("idle");
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("Could not start microphone. Use the text box below.");
      setShowTextInput(true);
    }
  }, [sendToAgent]);

  /* â”€â”€â”€ Toggle mic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const toggleListening = useCallback(() => {
    if (!supported) return;

    if (appState === "speaking" || appState === "paused" || appState === "interrupted") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAppState("interrupted");
      try {
        interruptionRecognitionRef.current?.stop();
      } catch {}

      if (isListening) {
        try {
          recognitionRef.current?.stop();
        } catch {}
        setAppState("idle");
        setInterimTranscript("");
        return;
      }

      setAppState("idle");
      setTimeout(() => {
        startActiveListening();
      }, 100);
      return;
    }

    if (isThinking) return;

    if (isListening) {
      sentRef.current = true;
      recognitionRef.current?.stop();
      setAppState("idle");
      setInterimTranscript("");
      return;
    }

    startActiveListening();
  }, [supported, appState, isListening, isThinking, startActiveListening]);

  /* â”€â”€â”€ Text input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || isBusy) return;
    sendToAgent(textInput.trim());
    setTextInput("");
  }, [textInput, isBusy, sendToAgent]);

  const handleTextKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  /* â”€â”€â”€ Space shortcut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body && !isBusy && supported) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleListening, isBusy, supported]);

  /* â”€â”€â”€ Chronological Feed Generator â”€â”€â”€ */
  const getChronologicalFeed = (): FeedItem[] => {
    const feed: FeedItem[] = [];

    // 1. Add Briefing loaded if it exists
    if (dailyBriefing && briefingTimestamp) {
      feed.push({
        id: "feed-briefing",
        timestamp: briefingTimestamp,
        type: "system",
        label: "Briefing Compiled",
        content: "Proactive Chief of Staff generated the daily focus and recommendations.",
      });
    }

    // 2. Add Goals
    goals.forEach((goal) => {
      feed.push({
        id: `feed-goal-${goal.id}`,
        timestamp: new Date(goal.createdAt),
        type: "system",
        label: "Goal Planned",
        content: `Active roadmap: "${goal.title}" initialized.`,
      });
    });

    // 3. Add General Tasks
    store.tasks.forEach((task) => {
      feed.push({
        id: `feed-task-${task.id}`,
        timestamp: new Date(task.createdAt),
        type: "tool",
        label: "Task Registered",
        content: `Task "${task.title}" added to active store.`,
      });
    });

    // 4. Add Notes
    store.notes.forEach((note) => {
      feed.push({
        id: `feed-note-${note.id}`,
        timestamp: new Date(note.createdAt),
        type: "tool",
        label: "Note Cataloged",
        content: `Note context captured: "${note.content.slice(0, 60)}..."`,
      });
    });

    // 5. Add Messages
    messages.forEach((msg) => {
      feed.push({
        id: `feed-msg-${msg.id}`,
        timestamp: msg.timestamp,
        type: msg.role === "user" ? "user" : "assistant",
        label: msg.role === "user" ? "User Query" : "System Reply",
        content: msg.content,
        meta: { mode: msg.mode },
      });
    });

    // Sort descending by timestamp
    return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  interface FeedItem {
    id: string;
    timestamp: Date;
    type: "system" | "user" | "assistant" | "tool" | "council";
    label: string;
    content: string;
    meta?: { mode?: AgentMode };
  }

  const chronologicalFeed = getChronologicalFeed();
  const lastResponse =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? messages[messages.length - 1].content
      : "";

  const STATE_DOT_COLORS: Record<AppState, string> = {
    idle: "var(--border-mid)",
    listening: "hsl(142, 55%, 48%)",
    thinking: "hsl(38, 80%, 55%)",
    speaking: "hsl(220, 80%, 60%)",
    interrupted: "hsl(0, 60%, 50%)",
    paused: "hsl(270, 28%, 55%)",
  };

  const STATE_LABELS: Record<AppState, string> = {
    idle: "Idle",
    listening: "Listening",
    thinking: "Processing",
    speaking: "Speaking",
    interrupted: "Interrupted",
    paused: "Paused",
  };

  const cfg = {
    dotColor: STATE_DOT_COLORS[appState],
    label: STATE_LABELS[appState],
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        userSelect: "none",
      }}
    >
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header
        style={{
          height: "48px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-1)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="7.5" stroke="var(--text-muted)" strokeWidth="1" />
            <circle cx="9" cy="9" r="3" fill="var(--text-muted)" />
          </svg>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Voice OS
          </span>
          <span className="badge badge--system" style={{ fontFamily: "var(--font-mono)" }}>
            v2.0
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Voice selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              background: "var(--bg-2)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 10c1-2 5.5-3 8-1"
                stroke="var(--text-muted)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <circle cx="6" cy="4.5" r="2.5" stroke="var(--text-muted)" strokeWidth="1" />
            </svg>
            <select
              id="voice-selector"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isBusy}
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                outline: "none",
                border: "none",
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.5 : 1,
                colorScheme: "dark",
              }}
            >
              <option value="en-US-miles">Miles</option>
              <option value="en-US-terrell">Terrell</option>
              <option value="en-US-caleb">Caleb</option>
              <option value="en-US-natalie">Natalie</option>
              <option value="en-US-amara">Amara</option>
            </select>
          </div>

          {/* State badge */}
          <div className="state-badge">
            <span className="state-dot" style={{ background: cfg.dotColor }} />
            <span style={{ color: "var(--text-secondary)" }}>{cfg.label}</span>
          </div>

          {/* Activity toggle */}
          <button
            id="toggle-activity-feed"
            onClick={() => setShowRightSidebar((v) => !v)}
            className="btn-system"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <line x1="9" y1="1" x2="9" y2="13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {showRightSidebar ? "Hide Log" : "Show Log"}
          </button>
        </div>
      </header>

      {/* â”€â”€â”€ Main Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: showRightSidebar ? "260px 1fr 260px" : "260px 1fr",
          overflow: "hidden",
          height: "calc(100vh - 48px)",
        }}
      >
        {/* â”€â”€ LEFT: Context Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <aside
          className="sidebar-context"
          style={{
            borderRight: "1px solid var(--border-subtle)",
            background: "var(--bg-1)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* Mode selector */}
          <ModeSelector activeMode={activeMode} onSelect={handleModeSelect} disabled={isBusy} />

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            {(["goals", "tasks-notes"] as const).map((tab) => {
              const isActive = leftSidebarTab === tab;
              const label = tab === "goals" ? `Goals (${goals.length})` : "Tasks & Notes";
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setLeftSidebarTab(tab)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive
                      ? "2px solid var(--text-primary)"
                      : "2px solid transparent",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                    transition:
                      "color var(--dur-micro) var(--ease-out), border-color var(--dur-micro) var(--ease-out)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {leftSidebarTab === "goals" ? (
              <GoalPanel goals={goals} handleToggleGoalTask={handleToggleGoalTask} />
            ) : (
              <TaskPanel
                store={store}
                onDeleteTask={(taskId) =>
                  setStore((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }))
                }
                onDeleteNote={(noteId) =>
                  setStore((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== noteId) }))
                }
              />
            )}
          </div>
        </aside>

        {/* â”€â”€ CENTER: Voice + Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-base)",
            overflowY: "auto",
            borderRight: showRightSidebar ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          {/* Voice Core â€” Primary Layer (always dominant) */}
          <VoiceControlCore
            appState={appState}
            supported={supported}
            isBusy={isBusy}
            toggleListening={toggleListening}
            textInput={textInput}
            setTextInput={setTextInput}
            handleTextKeyDown={handleTextKeyDown}
            handleTextSubmit={handleTextSubmit}
            activeMode={activeMode}
            interimTranscript={interimTranscript}
          />

          {/* Content area */}
          <div
            style={{
              flex: 1,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              overflowY: "auto",
            }}
          >
            {/* Error */}
            {error && (
              <div
                className="panel-enter"
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid hsl(0, 60%, 30%)",
                  background: "hsl(0, 60%, 10%)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{ flexShrink: 0, marginTop: "1px" }}
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="6" stroke="hsl(0, 60%, 55%)" strokeWidth="1.2" />
                  <line
                    x1="7"
                    y1="4"
                    x2="7"
                    y2="7.5"
                    stroke="hsl(0, 60%, 55%)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="9.5" r="0.8" fill="hsl(0, 60%, 55%)" />
                </svg>
                <p
                  style={{ flex: 1, fontSize: "12px", color: "hsl(0, 60%, 65%)", lineHeight: 1.5 }}
                >
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 0,
                    display: "flex",
                  }}
                  aria-label="Dismiss error"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
              </div>
            )}

            {/* Daily Briefing */}
            {dailyBriefing && (
              <div
                className="panel-card panel-enter"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-subtle)",
                    paddingBottom: "10px",
                  }}
                >
                  <span className="label-system" style={{ color: "hsl(220, 80%, 65%)" }}>
                    Daily Briefing
                  </span>
                  <button
                    id="speak-briefing-btn"
                    onClick={() => playVoice(dailyBriefing)}
                    className="btn-system"
                    disabled={isBusy}
                    style={{ fontSize: "10px" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <polygon points="3 2 11 7 3 12 3 2" fill="currentColor" />
                    </svg>
                    Speak
                  </button>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.65 }}>
                  {dailyBriefing}
                </p>

                {/* Daily focus callout */}
                {dailyFocus && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-base)",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ flexShrink: 0, marginTop: "2px" }}
                      aria-hidden="true"
                    >
                      <circle cx="6" cy="6" r="5" stroke="hsl(220, 80%, 60%)" strokeWidth="1" />
                      <circle cx="6" cy="6" r="2" fill="hsl(220, 80%, 60%)" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="label-system" style={{ fontSize: "9px" }}>
                        Active Focus
                      </span>
                      <span
                        style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}
                      >
                        {dailyFocus}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div
                className="panel-enter"
                style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}
              >
                <span className="label-system">Proactive Insights</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="panel-card"
                      style={{
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid var(--border-subtle)",
                          paddingBottom: "6px",
                        }}
                      >
                        <span className={`badge badge--${rec.priority}`}>{rec.priority}</span>
                        <span className="label-system" style={{ fontSize: "9px" }}>
                          {rec.type.replace(/-/g, " ")}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {rec.description}
                      </p>
                      {rec.actionLabel && (
                        <button
                          onClick={() => {
                            if (rec.targetGoalId) setLeftSidebarTab("goals");
                            else setLeftSidebarTab("tasks-notes");
                          }}
                          className="btn-ghost"
                          style={{ alignSelf: "flex-start", padding: "3px 8px", fontSize: "10px" }}
                        >
                          {rec.actionLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Response Output */}
            {lastResponse && (
              <div
                className="panel-enter"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flex: 1,
                  minHeight: "120px",
                }}
              >
                <span className="label-system">System Response</span>
                <div
                  style={{
                    flex: 1,
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-soft)",
                    background: "var(--bg-1)",
                    overflowY: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    lineHeight: 1.7,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {lastResponse}
                </div>
              </div>
            )}

            {/* Empty / Ready state */}
            {!lastResponse && recommendations.length === 0 && !dailyBriefing && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  textAlign: "center",
                  padding: "40px",
                  opacity: 0.5,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <circle cx="14" cy="14" r="12" stroke="var(--border-mid)" strokeWidth="1" />
                  <circle cx="14" cy="14" r="4" fill="var(--border-mid)" />
                </svg>
                <p className="label-system">Console ready</p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    maxWidth: "240px",
                    lineHeight: 1.6,
                  }}
                >
                  Press Space to activate voice input, or type a command below.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* â”€â”€ RIGHT: Activity Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {showRightSidebar && (
          <aside
            className="sidebar-activity"
            style={{
              background: "var(--bg-1)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <AgentActivityIndicator lastCouncil={lastCouncil} councilProgress={councilProgress} />
            <CommandFeed chronologicalFeed={chronologicalFeed} />
          </aside>
        )}
      </div>
    </div>
  );
}
