"use client";
import { useState, useEffect } from "react";
import { SkipForward, Settings } from "lucide-react";

type Phase = "pomo" | "short" | "long";

export default function PomodoroTimer() {
  const [isBreak, setIsBreak] = useState(false);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [pomoCount, setPomoCount] = useState(0);

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
    setMinutes(phase === "pomo" ? 25 : phase === "short" ? 5 : 15);
    setSeconds(0);
    setIsRunning(keepRunning);
  };

  const handleSkip = () => {
    const next = getNextPhase(currentPhase);
    if (!next) return;
    goToPhase(next, true);
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
        setMinutes(5);
        setSeconds(0);
        setIsRunning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds]);

  return (
    <div className="w-106.25 h-68 bg-(--light-blue) rounded-[30px] border-4 border-(--dark-blue) p-8 flex flex-col items-center justify-center gap-6">
      {/* Toggle */}
      <div className="flex gap-2 text-white">
        <button
          onClick={() => {
            setIsBreak(false);
            setIsLongBreak(false);
            setMinutes(25);
            setSeconds(0);
            setIsRunning(false);
          }}
          className={`cursor-pointer w-28 px-1 py-1 text-white transition hover:bg-(--dark-blue) ${
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
            setMinutes(5);
            setSeconds(0);
            setIsRunning(false);
          }}
          className={`cursor-pointer w-28 px-1 py-1 transition hover:bg-(--dark-blue) ${
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
            setMinutes(15);
            setSeconds(0);
            setIsRunning(false);
          }}
          className={`cursor-pointer w-28 px-1 py-1 transition hover:bg-(--dark-blue) ${
            isLongBreak
              ? "rounded-sm bg-(--dark-blue)"
              : "rounded-sm bg-(--dark-blue)/50"
          }`}
        >
          Long Break
        </button>
      </div>

      {/* Timer display */}
      <p className="font-mono text-8xl text-(--dark-blue)">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </p>

      {/* Settings, Start, and Skip buttons */}
      <div className="flex gap-18 text-white">
        <button className="text-(--dark-blue) hover:opacity-50 transition-opacity cursor-pointer">
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
    </div>
  );
}
