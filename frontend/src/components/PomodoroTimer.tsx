"use client";
import { useState, useEffect } from "react";
import { SkipForward, Settings, X, Save } from "lucide-react";

type Phase = "pomo" | "short" | "long";

export default function PomodoroTimer() {
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

  const getNextPhase = (phase: Phase): Phase | null => {
    if (phase === "pomo") {
      return (pomoCount + 1) % 4 === 0 ? "long" : "short";
    }
    if (phase === "short") return "pomo";
    if (phase === "long") return "pomo";
    return null;
  };

  const goToPhase = (phase: Phase, keepRunning = false) => {
    if (currentPhase === "pomo") setPomoCount((c) => c + 1);
    setIsBreak(phase === "short");
    setIsLongBreak(phase === "long");
    setMinutes(
      phase === "pomo"
        ? durations.pomo
        : phase === "short"
        ? durations.short
        : durations.long
    );
    setSeconds(0);
    setIsRunning(keepRunning);
  };

  const handleSkip = () => {
    const next = getNextPhase(currentPhase);
    if (!next) return;
    goToPhase(next, true);
  };

  const handleSaveSettings = () => {
    setDurations(draft);
    setMinutes(draft[currentPhase]);
    setSeconds(0);
    setIsRunning(false);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setDraft(durations);
    setShowSettings(true);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (seconds > 0) {
        setSeconds((s) => s - 1);
      } else if (minutes > 0) {
        setMinutes((m) => m - 1);
        setSeconds(59);
      } else {
        // Timer finished
        setIsBreak(true);
        setIsLongBreak(false);
        setMinutes(durations.short);
        setSeconds(0);
        setIsRunning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds, durations]);

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
                    Math.max(1, Number(e.target.value))
                  );
                  setDraft((d) => ({ ...d, [phase]: val }));
                }}
                className="w-16 text-center font-mono text-(--dark-blue) bg-white/75 border-2 border-(--dark-blue) rounded-md"
              />
            </div>
          ))}

          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => {
                setDraft({ pomo: 25, short: 5, long: 15 });
              }}
              className="text-sm rounded-lg shrink-0 px-4 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-white/75 cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75"
            >
              Reset
            </button>
            <button
              onClick={handleSaveSettings}
              className="text-sm rounded-lg flex-1 px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer shadow-[0_4px_0_0_var(--dark-blue)] hover:shadow-none hover:translate-y-1 transition-all duration-75"
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
              onClick={() => {
                setIsBreak(false);
                setIsLongBreak(false);
                setMinutes(durations.pomo);
                setSeconds(0);
                setIsRunning(false);
              }}
              className={`cursor-pointer flex-1 px-1 py-1 text-white transition hover:bg-(--dark-blue) ${
                !isBreak && !isLongBreak
                  ? "rounded-sm bg-(--dark-blue)"
                  : "rounded-sm bg-(--dark-blue)/50"
              }`}
            >
              Pomodoro
            </button>
            <button
              onClick={() => {
                setIsBreak(true);
                setIsLongBreak(false);
                setMinutes(durations.short);
                setSeconds(0);
                setIsRunning(false);
              }}
              className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) ${
                isBreak
                  ? "rounded-sm bg-(--dark-blue)"
                  : "rounded-sm bg-(--dark-blue)/50"
              }`}
            >
              Short Break
            </button>
            <button
              onClick={() => {
                setIsBreak(false);
                setIsLongBreak(true);
                setMinutes(durations.long);
                setSeconds(0);
                setIsRunning(false);
              }}
              className={`cursor-pointer flex-1 px-1 py-1 transition hover:bg-(--dark-blue) ${
                isLongBreak
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
              className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer"
            >
              <Settings size={24} />
            </button>

            <button
              onClick={() => setIsRunning((r) => !r)}
              className={`w-35 rounded-[20px] px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer transition-all duration-75 ${
                isRunning
                  ? "shadow-none translate-y-1"
                  : "shadow-[0_4px_0_0_var(--dark-blue)]"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>

            {isRunning && getNextPhase(currentPhase) !== null ? (
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
