"use client";
import { useState, useEffect } from "react";
import { SkipForward, Settings, X, Save } from "lucide-react";
import { getSocket } from "@/lib/socket";

type Phase = "pomo" | "short" | "long";

interface PomodoroState {
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

export default function PomodoroTimer({ roomId }: PomodoroTimerProps) {
  // User tracking
  const [hostId, setHostId] = useState<string | null>(null);
  const [isCurrentUserHost, setIsCurrentUserHost] = useState(false);

  // Server state
  const [serverPomodoroState, setServerPomodoroState] = useState<PomodoroState | null>(null);

  // Local display state
  const [isBreak, setIsBreak] = useState(false);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [pomoCount, setPomoCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [durations, setDurations] = useState({
    pomo: 25,
    short: 5,
    long: 15,
  });

  const [draft, setDraft] = useState(durations);

  const currentPhase: Phase = isLongBreak ? "long" : isBreak ? "short" : "pomo";

  // Socket setup
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: { hostId: string; pomodoroState: PomodoroState | null }) => {
      console.log("Received room-state:", data);
      setHostId(data.hostId);
      if (data.pomodoroState) {
        setServerPomodoroState(data.pomodoroState);
        syncLocalStateFromServer(data.pomodoroState);
      }
    };

    const handleTimerUpdated = (data: PomodoroState) => {
      console.log("Received timer-updated:", data);
      setServerPomodoroState(data);
      syncLocalStateFromServer(data);
    };

    const handleError = (data: { message: string }) => {
      console.error("Socket error:", data.message);
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
    import("@/supabaseClient").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user.id && hostId) {
          setIsCurrentUserHost(session.user.id === hostId);
        }
      });
    });
  }, [hostId]);

  const syncLocalStateFromServer = (state: PomodoroState) => {
    // Determine phase
    const phase = state.mode === "pomodoro" ? "pomo" : state.mode === "short_break" ? "short" : "long";
    setIsBreak(phase === "short");
    setIsLongBreak(phase === "long");

    // Set running status
    setIsRunning(state.status === "running");

    // Calculate and set time display
    if (state.status === "running" && state.endTime) {
      // Timer is running, use endTime to calculate remaining
      const now = Date.now();
      const remaining = Math.max(0, state.endTime - now);
      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      setMinutes(mins);
      setSeconds(secs);
    } else {
      // Timer is paused or idle
      const timeMs = state.remainingTime || state.duration || 25 * 60 * 1000;
      const mins = Math.floor(timeMs / (60 * 1000));
      const secs = Math.floor((timeMs % (60 * 1000)) / 1000);
      setMinutes(mins);
      setSeconds(secs);
    }
  };

  const getNextPhase = (phase: Phase): Phase | null => {
    if (phase === "pomo") {
      return (pomoCount + 1) % 4 === 0 ? "long" : "short";
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
    const next = getNextPhase(currentPhase);
    if (!next) return;

    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting change-pomo-mode for roomId:", roomId, "mode:", modeMap[next]);
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[next] });
  };

  const handleChangeMode = (phase: Phase) => {
    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Emitting change-pomo-mode for roomId:", roomId, "mode:", modeMap[phase]);
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[phase] });
  };

  const handleSaveSettings = () => {
    setDurations(draft);
    // Calculate new duration for current mode
    const currentModeName = currentPhase === "pomo" ? "pomo" : currentPhase === "short" ? "short" : "long";
    const newDurationMs = draft[currentModeName] * 60 * 1000;

    const modeMap = { pomo: "pomodoro", short: "short_break", long: "long_break" };
    const socket = getSocket();
    socket.emit("change-pomo-mode", { roomId, mode: modeMap[currentPhase] });

    setMinutes(draft[currentModeName]);
    setSeconds(0);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setDraft(durations);
    setShowSettings(true);
  };

  // Timer interval - sync with server
  useEffect(() => {
    if (!isRunning || !serverPomodoroState?.endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const endTime = serverPomodoroState.endTime;
      if (!endTime) return;

      const remaining = Math.max(0, endTime - now);

      if (remaining <= 0) {
        // Timer finished, will be updated via socket
        return;
      }

      const mins = Math.floor(remaining / (60 * 1000));
      const secs = Math.floor((remaining % (60 * 1000)) / 1000);
      setMinutes(mins);
      setSeconds(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, serverPomodoroState?.endTime]);

  return (
    <div className="w-full bg-(--light-blue) rounded-[30px] border-4 border-(--dark-blue) p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center gap-4 lg:gap-6">
      {showSettings ? (
        /* Settings panel */
        <div className="flex flex-col w-full gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-(--dark-blue) font-bold text-xl">Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
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
                value={draft[phase]}
                onChange={(e) => {
                  const val = Math.min(
                    200,
                    Math.max(1, Number(e.target.value)),
                  );
                  setDraft((d) => ({ ...d, [phase]: val }));
                }}
                disabled={!isCurrentUserHost}
                className="w-16 text-center font-mono text-(--dark-blue) bg-white/75 border-2 border-(--dark-blue) rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          ))}

          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => {
                setDraft({ pomo: 25, short: 5, long: 15 });
              }}
              disabled={!isCurrentUserHost}
              className="text-sm rounded-lg shrink-0 px-4 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-white/75 cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={!isCurrentUserHost}
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
              disabled={!isCurrentUserHost}
              className={`cursor-pointer flex-1 px-1 py-1 text-white transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${!isBreak && !isLongBreak
                ? "rounded-sm bg-(--dark-blue)"
                : "rounded-sm bg-(--dark-blue)/50"
                }`}
            >
              Pomodoro
            </button>
            <button
              onClick={() => handleChangeMode("short")}
              disabled={!isCurrentUserHost}
              className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${isBreak
                ? "rounded-sm bg-(--dark-blue)"
                : "rounded-sm bg-(--dark-blue)/50"
                }`}
            >
              Short Break
            </button>
            <button
              onClick={() => handleChangeMode("long")}
              disabled={!isCurrentUserHost}
              className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) disabled:opacity-50 disabled:cursor-not-allowed ${isLongBreak
                ? "rounded-sm bg-(--dark-blue)"
                : "rounded-sm bg-(--dark-blue)/50"
                }`}
            >
              Long Break
            </button>
          </div>

          {/* Time */}
          <p className="bg-white/75 rounded-md w-full text-center font-mono text-5xl lg:text-6xl 2xl:text-7xl text-(--dark-blue)">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>

          {/* Settings, Start, and Skip buttons */}
          <div className="flex justify-between w-full text-white">
            <button
              onClick={handleOpenSettings}
              disabled={!isCurrentUserHost}
              className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Settings size={24} />
            </button>

            <button
              onClick={isRunning ? handlePauseTimer : handleStartTimer}
              disabled={!isCurrentUserHost}
              className={`w-35 rounded-[20px] px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed ${isRunning
                ? "shadow-none translate-y-1"
                : "shadow-[0_4px_0_0_var(--dark-blue)]"
                }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>

            {isRunning && getNextPhase(currentPhase) !== null && isCurrentUserHost ? (
              <button
                onClick={handleSkip}
                className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer"
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
  );
}
