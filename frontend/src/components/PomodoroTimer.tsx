"use client";
import { useReducer, useEffect, useState } from "react";
import { SkipForward, Settings, X, Save, ChevronUp, Clock } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { supabase } from "@/supabaseClient";

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
  // User tracking
  hostId: string | null;
  isCurrentUserHost: boolean;

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
  | { type: "SET_HOST_ID"; payload: string }
  | { type: "SET_IS_CURRENT_USER_HOST"; payload: boolean }
  | { type: "SET_SERVER_STATE"; payload: ServerPomodoroState | null }
  | { type: "SET_TIMER"; payload: { minutes: number; seconds: number } }
  | { type: "SET_PHASE"; payload: { isBreak: boolean; isLongBreak: boolean } }
  | { type: "SET_RUNNING"; payload: boolean }
  | { type: "INCREMENT_POMO_COUNT" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "UPDATE_DRAFT"; payload: Partial<{ pomo: number; short: number; long: number }> }
  | { type: "SAVE_SETTINGS" }
  | { type: "RESET_SETTINGS" };

const initialState: TimerState = {
  hostId: null,
  isCurrentUserHost: false,
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
    case "SET_HOST_ID":
      return { ...state, hostId: action.payload };
    case "SET_IS_CURRENT_USER_HOST":
      return { ...state, isCurrentUserHost: action.payload };
    case "SET_SERVER_STATE":
      return { ...state, serverPomodoroState: action.payload };
    case "SET_TIMER":
      return { ...state, minutes: action.payload.minutes, seconds: action.payload.seconds };
    case "SET_PHASE":
      return { ...state, isBreak: action.payload.isBreak, isLongBreak: action.payload.isLongBreak };
    case "SET_RUNNING":
      return { ...state, isRunning: action.payload };
    case "INCREMENT_POMO_COUNT":
      return { ...state, pomoCount: state.pomoCount + 1 };
    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings, draft: state.durations };
    case "UPDATE_DRAFT":
      return {
        ...state,
        draft: { ...state.draft, ...action.payload },
      };
    case "SAVE_SETTINGS":
      return {
        ...state,
        durations: state.draft,
        showSettings: false,
      };
    case "RESET_SETTINGS":
      return {
        ...state,
        draft: { pomo: 25, short: 5, long: 15 },
      };
    default:
      return state;
  }
}


export default function PomodoroTimer({ roomId }: PomodoroTimerProps) {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentPhase: Phase = state.isLongBreak ? "long" : state.isBreak ? "short" : "pomo";

  // Socket setup
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: { hostId: string; pomodoroState: ServerPomodoroState | null }) => {
      console.log("Received room-state:", data);
      dispatch({ type: "SET_HOST_ID", payload: data.hostId });
      if (data.pomodoroState) {
        dispatch({ type: "SET_SERVER_STATE", payload: data.pomodoroState });
        syncLocalStateFromServer(data.pomodoroState, dispatch);
      }
    };

    const handleTimerUpdated = (data: ServerPomodoroState) => {
      console.log("Received timer-updated:", data);
      dispatch({ type: "SET_SERVER_STATE", payload: data });
      syncLocalStateFromServer(data, dispatch);
    };

    const handleError = (data: { message: string }) => {
      // Suppress expected errors that occur during normal operation
      const suppressedErrors = ["Session not found", "Only host can control timer"];
      if (!suppressedErrors.includes(data.message)) {
        console.error("Socket error:", data.message);
      }
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

  // Check if current user is host
  useEffect(() => {
    // Get current user ID from supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.id && state.hostId) {
        dispatch({ type: "SET_IS_CURRENT_USER_HOST", payload: session.user.id === state.hostId });
      }
    });
  }, [state.hostId]);

  const syncLocalStateFromServer = (serverState: ServerPomodoroState, dispatcher: typeof dispatch) => {
    // Determine phase
    const phase = serverState.mode === "pomodoro" ? "pomo" : serverState.mode === "short_break" ? "short" : "long";
    dispatcher({ type: "SET_PHASE", payload: { isBreak: phase === "short", isLongBreak: phase === "long" } });

    // Set running status
    dispatcher({ type: "SET_RUNNING", payload: serverState.status === "running" });

    // Calculate and set time display
    if (serverState.status === "running" && serverState.endTime) {
      // Timer is running, use endTime to calculate remaining
      const now = Date.now();
      const remaining = Math.max(0, serverState.endTime - now);
      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      dispatcher({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    } else {
      // Timer is paused or idle
      const timeMs = serverState.remainingTime || serverState.duration || 25 * 60 * 1000;
      const mins = Math.floor(timeMs / (60 * 1000));
      const secs = Math.floor((timeMs % (60 * 1000)) / 1000);
      dispatcher({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    }
  };

  const getNextPhase = (phase: Phase): Phase | null => {
    if (phase === "pomo") {
      return (state.pomoCount + 1) % 4 === 0 ? "long" : "short";
    }
    if (phase === "short") return "pomo";
    if (phase === "long") return "pomo";
    return null;
  };

  const handleStartTimer = () => {
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting start-timer for roomId:", roomId);
    socket.emit("start-timer", { roomId });
  };

  const handlePauseTimer = () => {
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting pause-timer for roomId:", roomId);
    socket.emit("pause-timer", { roomId });
  };

  const handleSkip = () => {
    // Only host can skip/advance timer
    if (!state.isCurrentUserHost) return;

    const next = getNextPhase(currentPhase);
    if (!next) return;

    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting change-pomo-mode for roomId:", roomId, "mode:", modeMap[next]);
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[next], durations: state.durations });
  };

  const handleChangeMode = (phase: Phase) => {
    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting change-pomo-mode for roomId:", roomId, "mode:", modeMap[phase]);
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[phase], durations: state.durations });
  };

  const handleSaveSettings = () => {
    dispatch({ type: "SAVE_SETTINGS" });
    // Calculate new duration for current mode
    const currentModeName = currentPhase === "pomo" ? "pomo" : currentPhase === "short" ? "short" : "long";

    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[currentPhase], durations: state.draft });

    dispatch({ type: "SET_TIMER", payload: { minutes: state.draft[currentModeName], seconds: 0 } });
  };

  const handleOpenSettings = () => {
    dispatch({ type: "TOGGLE_SETTINGS" });
  };

  // Timer interval - sync with server
  useEffect(() => {
    if (!state.isRunning || !state.serverPomodoroState?.endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const endTime = state.serverPomodoroState?.endTime;
      if (!endTime) return;

      const remaining = Math.max(0, endTime - now);

      if (remaining <= 0) {
        // Timer finished - only host can advance
        if (state.isCurrentUserHost) {
          const next = getNextPhase(currentPhase);
          if (next) {
            const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
            const socket = getSocket();
            if (socket.connected) {
              socket.emit("change-pomo-mode", { roomId, mode: modeMap[next], durations: state.durations });
            }
          }
        }
        return;
      }

      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      dispatch({ type: "SET_TIMER", payload: { minutes: mins, seconds: secs } });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, state.serverPomodoroState?.endTime, state.isCurrentUserHost, state.durations, state.isBreak, state.isLongBreak, state.pomoCount, roomId]);

  return (
    <div
      className={`w-full bg-(--light-blue) rounded-[30px] border-4 border-(--dark-blue) p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center transition-[gap] duration-300 ease-in-out ${isCollapsed ? "gap-0" : "gap-4 lg:gap-6"
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
                      const val = Math.min(
                        200,
                        Math.max(1, Number(e.target.value)),
                      );
                      dispatch({ type: "UPDATE_DRAFT", payload: { [phase]: val } });
                    }}
                    disabled={!state.isCurrentUserHost}
                    className="w-16 text-center font-mono text-(--dark-blue) bg-white/75 border-2 border-(--dark-blue) rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}

              <div className="flex items-center gap-4 mt-1">
                <button
                  onClick={() => dispatch({ type: "RESET_SETTINGS" })}
                  disabled={!state.isCurrentUserHost}
                  className="text-sm rounded-lg shrink-0 px-4 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-white/75 cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={!state.isCurrentUserHost}
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
              {/* Toggle */}
              <div className="flex w-full gap-2 text-white">
                <button
                  onClick={() => handleChangeMode("pomo")}
                  disabled={!state.isCurrentUserHost}
                  className={`cursor-pointer flex-1 px-1 py-1 text-white transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${!state.isBreak && !state.isLongBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => handleChangeMode("short")}
                  disabled={!state.isCurrentUserHost}
                  className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${state.isBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Short Break
                </button>
                <button
                  onClick={() => handleChangeMode("long")}
                  disabled={!state.isCurrentUserHost}
                  className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${state.isLongBreak
                    ? "rounded-sm bg-(--dark-blue)"
                    : "rounded-sm bg-(--dark-blue)/50"
                    }`}
                >
                  Long Break
                </button>
              </div>

              {/* Time */}
              <p className="bg-white/75 rounded-md w-full text-center font-mono text-5xl lg:text-6xl 2xl:text-7xl text-(--dark-blue)">
                {String(state.minutes).padStart(2, "0")}:
                {String(state.seconds).padStart(2, "0")}
              </p>

              {/* Settings, Start, and Skip buttons */}
              <div className="flex justify-between w-full text-white">
                <button
                  onClick={handleOpenSettings}
                  disabled={!state.isCurrentUserHost}
                  className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Settings size={24} />
                </button>

                <button
                  onClick={state.isRunning ? handlePauseTimer : handleStartTimer}
                  disabled={!state.isCurrentUserHost}
                  className={`w-35 rounded-[20px] px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed ${state.isRunning
                    ? "shadow-none translate-y-1"
                    : "shadow-[0_4px_0_0_var(--dark-blue)]"
                    }`}
                >
                  {state.isRunning ? "Pause" : "Start"}
                </button>

                {getNextPhase(currentPhase) !== null ? (
                  <button
                    onClick={handleSkip}
                    disabled={!state.isRunning || !state.isCurrentUserHost}
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
