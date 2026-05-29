"use client";
import { useReducer, useEffect, useRef, useState } from "react";
import { SkipForward, Settings, X, Save, ChevronUp, Clock } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { alarm } from "@/lib/sounds";
import { click } from "@/lib/sounds";

const playAlarm = alarm("/sounds/timerAlarm.wav", 3000);
const playClick = click("/sounds/singleClick.wav");


type Phase = "pomo" | "short" | "long";

interface ServerPomodoroState {
  id: string;
  duration: number | null;
  status: string | null;
  mode: string | null;
  endTime: number | null;
  remainingTime: number | null;
}

interface PomodoroTimerProps {
  roomId: string;
}

interface TimerState {
  // PATCH 1: hostId and isCurrentUserHost removed entirely

  // Server state
  serverPomodoroState: ServerPomodoroState | null;

  // Timer display
  minutes: number;
  seconds: number;
  isBreak: boolean;
  isLongBreak: boolean;
  isRunning: boolean;
  pomoCount: number;

  // Settings
  durations: { pomo: number; short: number; long: number };
  draft: { pomo: number; short: number; long: number };
  showSettings: boolean;
}

type TimerAction =
  // PATCH 1: SET_HOST_ID and SET_IS_CURRENT_USER_HOST removed
  | { type: "SET_SERVER_STATE"; payload: ServerPomodoroState | null }
  | { type: "SET_TIMER"; payload: { minutes: number; seconds: number } }
  | { type: "SET_PHASE"; payload: { isBreak: boolean; isLongBreak: boolean } }
  | { type: "SET_RUNNING"; payload: boolean }
  | { type: "SET_DURATIONS"; payload: { pomo: number; short: number; long: number } }
  | { type: "INCREMENT_POMO_COUNT" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "UPDATE_DRAFT"; payload: Partial<{ pomo: number; short: number; long: number }> }
  | { type: "SAVE_SETTINGS" }
  | { type: "RESET_SETTINGS" };

const initialState: TimerState = {
  // PATCH 1: hostId and isCurrentUserHost removed
  serverPomodoroState: null,
  minutes: 25,
  seconds: 0,
  isBreak: false,
  isLongBreak: false,
  isRunning: false,
  pomoCount: 0,
  durations: { pomo: 25, short: 5, long: 15 },
  draft: { pomo: 25, short: 5, long: 15 },
  showSettings: false,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    // PATCH 1: SET_HOST_ID and SET_IS_CURRENT_USER_HOST cases removed
    case "SET_SERVER_STATE":
      return { ...state, serverPomodoroState: action.payload };
    case "SET_TIMER":
      return { ...state, minutes: action.payload.minutes, seconds: action.payload.seconds };
    case "SET_PHASE":
      return { ...state, isBreak: action.payload.isBreak, isLongBreak: action.payload.isLongBreak };
    case "SET_RUNNING":
      return { ...state, isRunning: action.payload };
    case "SET_DURATIONS":
      return { ...state, durations: action.payload, draft: action.payload };
    case "INCREMENT_POMO_COUNT":
      return { ...state, pomoCount: state.pomoCount + 1 };
    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings, draft: state.durations };
    case "UPDATE_DRAFT":
      return { ...state, draft: { ...state.draft, ...action.payload } };
    case "SAVE_SETTINGS":
      return { ...state, durations: state.draft, showSettings: false };
    case "RESET_SETTINGS":
      return { ...state, draft: { pomo: 25, short: 5, long: 15 } };
    default:
      return state;
  }
}

export default function PomodoroTimer({ roomId }: PomodoroTimerProps) {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentPhase: Phase = state.isLongBreak ? "long" : state.isBreak ? "short" : "pomo";

  // PATCH 5: Stable refs so the interval never needs to re-subscribe when
  // these values change mid-run, preventing the double-fire on expiry.
  const endTimeRef = useRef<number | null>(null);
  const currentPhaseRef = useRef<Phase>(currentPhase);
  const pomoCountRef = useRef<number>(state.pomoCount);
  const durationsRef = useRef(state.durations);
  const isRunningRef = useRef(state.isRunning);

  // Keep refs in sync with state on every render
  currentPhaseRef.current = currentPhase;
  pomoCountRef.current = state.pomoCount;
  durationsRef.current = state.durations;
  isRunningRef.current = state.isRunning;

  const syncLocalStateFromServer = (
    serverState: ServerPomodoroState,
    dispatcher: typeof dispatch,
  ) => {
    const phase =
      serverState.mode === "pomodoro"
        ? "pomo"
        : serverState.mode === "short_break"
          ? "short"
          : "long";

    dispatcher({
      type: "SET_PHASE",
      payload: { isBreak: phase === "short", isLongBreak: phase === "long" },
    });
    dispatcher({ type: "SET_RUNNING", payload: serverState.status === "running" });

    // PATCH 3: Use SET_DURATIONS (updates state.durations) instead of
    // UPDATE_DRAFT (which only updated the settings panel draft copy).
    if (serverState.duration) {
      const durationInMins = Math.round(serverState.duration / (60 * 1000));
      dispatcher({
        type: "SET_DURATIONS",
        payload: { ...durationsRef.current, [phase]: durationInMins },
      });
    }

    if (serverState.status === "running" && serverState.endTime) {
      // PATCH 5: Mirror endTime into the ref so the interval picks it up
      // without needing to re-subscribe.
      endTimeRef.current = serverState.endTime;
      const now = Date.now();
      const remaining = Math.max(0, serverState.endTime - now);
      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      dispatcher({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    } else {
      endTimeRef.current = null;
      const timeMs =
        serverState.remainingTime || serverState.duration || 25 * 60 * 1000;
      const mins = Math.floor(timeMs / (60 * 1000));
      const secs = Math.floor((timeMs % (60 * 1000)) / 1000);
      dispatcher({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    }
  };

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return; // PATCH 4: null-check

    const handleRoomState = (data: {
      hostId: string; // kept in payload shape but no longer used client-side
      pomodoroState: ServerPomodoroState | null;
      customDurations?: { pomo: number; short: number; long: number };
    }) => {
      // PATCH 1: No longer dispatch SET_HOST_ID

      if (data.customDurations) {
        dispatch({ type: "SET_DURATIONS", payload: data.customDurations });
      }

      if (data.pomodoroState) {
        dispatch({ type: "SET_SERVER_STATE", payload: data.pomodoroState });
        syncLocalStateFromServer(data.pomodoroState, dispatch);
      }
    };

    const handleTimerUpdated = (data: ServerPomodoroState) => {
      // PATCH 6: console.log removed
      dispatch({ type: "SET_SERVER_STATE", payload: data });
      syncLocalStateFromServer(data, dispatch);
    };

    // PATCH 2: Use console.warn so "Session not found" and similar expected
    // server messages don't trigger the Next.js error overlay.
    const handleError = (data: { message: string }) => {
      console.warn("Socket warning:", data.message);
    };

    socket.on("room-state", handleRoomState);
    socket.on("timer-updated", handleTimerUpdated);
    socket.on("error", handleError);

    return () => {
      socket.off("room-state", handleRoomState);
      socket.off("timer-updated", handleTimerUpdated);
      socket.off("error", handleError);
    };
  }, []);

  // PATCH 1: Removed the supabase host-check useEffect entirely.

  const handleStartTimer = () => {
    // PATCH 4: null-check getSocket()
    const socket = getSocket();
    if (!socket?.connected) return;
    // PATCH 6: console.log removed
    socket.emit("start-timer", { roomId });
    playClick();
  };

  const handlePauseTimer = () => {
    // PATCH 4: null-check getSocket()
    const socket = getSocket();
    if (!socket?.connected) return;
    // PATCH 6: console.log removed
    socket.emit("pause-timer", { roomId });
    playClick();
  };

  const handleSkip = () => {
    const newCount =
      currentPhaseRef.current === "pomo"
        ? pomoCountRef.current + 1
        : pomoCountRef.current;

    if (currentPhaseRef.current === "pomo") dispatch({ type: "INCREMENT_POMO_COUNT" });

    let next: Phase = "pomo";
    if (currentPhaseRef.current === "pomo") {
      next = newCount % 4 === 0 ? "long" : "short";
    }

    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    // PATCH 4: null-check getSocket()
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("change-pomo-mode", {
        roomId,
        mode: modeMap[next],
        durations: durationsRef.current,
      });
    }
    playClick();
  };

  const handleChangeMode = (phase: Phase) => {
    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    // PATCH 4: null-check getSocket()
    const socket = getSocket();
    if (!socket?.connected) return;
    // PATCH 6: console.log removed
    socket.emit("change-pomo-mode", {
      roomId,
      mode: modeMap[phase],
      durations: durationsRef.current,
    });
    playClick();
  };

  const handleSaveSettings = () => {
    dispatch({ type: "SAVE_SETTINGS" });
    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    // PATCH 4: null-check getSocket()
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit("change-pomo-mode", {
      roomId,
      mode: modeMap[currentPhaseRef.current],
      durations: state.draft,
    });
    playClick();
  };

  // PATCH 5: Interval only depends on state.isRunning. All volatile values
  // (endTime, currentPhase, pomoCount, durations) are read from stable refs,
  // so the interval is never torn down mid-run and can't double-fire.
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      const endTime = endTimeRef.current;
      if (!endTime) return;

      const remaining = Math.max(0, endTime - Date.now());

      if (remaining <= 0) {
        clearInterval(interval);
        playAlarm();

        // PATCH 1: isCurrentUserHost guard removed — emit for everyone;
        // the server is responsible for deduplicating concurrent emits.
        const phase = currentPhaseRef.current;
        const newCount =
          phase === "pomo" ? pomoCountRef.current + 1 : pomoCountRef.current;
        if (phase === "pomo") dispatch({ type: "INCREMENT_POMO_COUNT" });

        let next: Phase = "pomo";
        if (phase === "pomo") {
          next = newCount % 4 === 0 ? "long" : "short";
        }

        const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
        // PATCH 4: null-check getSocket()
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("change-pomo-mode", {
            roomId,
            mode: modeMap[next],
            durations: durationsRef.current,
          });
        }
        return;
      }

      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      dispatch({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, roomId]); // PATCH 5: no longer depends on volatile state

  return (
    <div
      className={`w-full bg-(--light-blue) rounded-[30px] border-4 border-(--dark-blue) p-6 flex flex-col items-center justify-center transition-[gap] duration-300 ease-in-out ${isCollapsed ? "gap-0" : "gap-4 lg:gap-6"
        }`}
    >
      <div className="relative flex items-center justify-center w-full">
        <h2 className="text-(--dark-blue) font-(family-name:--font-pixelify) font-bold text-lg tracking-widest text-center flex items-center gap-2">
          <Clock size={20} />
          Timer
        </h2>
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          className="absolute right-0 text-(--dark-blue) hover:opacity-50 cursor-pointer"
        >
          <ChevronUp
            size={20}
            className={`transition-transform duration-300 ease-in-out ${isCollapsed ? "rotate-180" : ""
              }`}
          />
        </button>
      </div>

      <div
        className={`w-full overflow-hidden transition-[max-height] duration-300 ease-in-out ${isCollapsed ? "max-h-0" : "max-h-150"
          }`}
      >
        <div className="flex flex-col items-center justify-center gap-4 lg:gap-6 pb-1">
          {state.showSettings ? (
            /* Settings panel */
            <div className="flex flex-col w-full gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-(--dark-blue) font-bold text-xl">Settings</h2>
                <button
                  onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
                  className="text-white p-1 bg-(--dark-blue) rounded-md hover:opacity-50 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {(["pomo", "short", "long"] as Phase[]).map((phase) => (
                <div key={phase} className="flex justify-between items-center">
                  <label className="text-(--dark-blue)">
                    {phase === "pomo"
                      ? "Pomodoro"
                      : phase === "short"
                        ? "Short Break"
                        : "Long Break"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={state.draft[phase]}
                    onChange={(e) => {
                      const val = Math.min(200, Math.max(1, Number(e.target.value)));
                      dispatch({ type: "UPDATE_DRAFT", payload: { [phase]: val } });
                    }}
                    className="w-16 text-center font-mono text-(--dark-blue) bg-white/75 border-2 border-(--dark-blue) rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}

              <div className="flex items-center gap-4 mt-1">
                <button
                  onClick={() => {
                    playClick();
                    dispatch({ type: "RESET_SETTINGS" })}
                  }
                  className="text-sm rounded-lg shrink-0 px-4 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-white/75 cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="text-sm rounded-lg flex-1 px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    Save <Save size={16} className="inline" />
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Timer display */
            <>
              {/* Mode toggle */}
              <div className="flex w-full gap-2 text-white">
                <button
                  onClick={() => handleChangeMode("pomo")}
                  className={`cursor-pointer flex-1 px-1 py-1 text-white transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${!state.isBreak && !state.isLongBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => handleChangeMode("short")}
                  className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${state.isBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Short Break
                </button>
                <button
                  onClick={() => handleChangeMode("long")}
                  className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${state.isLongBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Long Break
                </button>
              </div>

              {/* Time display */}
              <p className="bg-white/75 rounded-md w-full text-center font-mono text-5xl lg:text-6xl 2xl:text-7xl text-(--dark-blue)">
                {String(state.minutes).padStart(2, "0")}:
                {String(state.seconds).padStart(2, "0")}
              </p>

              {/* Controls */}
              <div className="flex justify-between w-full text-white">
                <button
                  onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
                  className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Settings size={24} />
                </button>

                <button
                  onClick={state.isRunning ? handlePauseTimer : handleStartTimer}
                  className={`w-35 rounded-[20px] px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed ${state.isRunning
                    ? "shadow-none translate-y-1"
                    : "shadow-[0_4px_0_0_var(--dark-blue)]"
                    }`}
                >
                  {state.isRunning ? "Pause" : "Start"}
                </button>

                {/* PATCH 7: Skip button shown whenever phase is not "long".
                    getNextPhase() was removed — it never returned null in
                    practice so the button was always rendered anyway. */}
                {currentPhase !== "long" ? (
                  <button
                    onClick={handleSkip}
                    disabled={!state.isRunning}
                    className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SkipForward size={24} fill="var(--dark-blue)" />
                  </button>
                ) : (
                  <div className="w-6" />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}