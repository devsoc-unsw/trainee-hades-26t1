"use client";
import { useState, useEffect } from "react";

export default function PomodoroTimer() {
  const [isBreak, setIsBreak] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

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
        setIsRunning(false);
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
            setMinutes(25);
            setSeconds(0);
            setIsRunning(false);
          }}
          className={`cursor-pointer w-28 px-2 py-2 text-white transition hover:bg-(--dark-blue) ${
            !isBreak
              ? "rounded-[15px] bg-(--dark-blue)"
              : "rounded-[15px] bg-(--dark-blue)/50"
          }`}
        >
          Pomodoro
        </button>
        <button
          onClick={() => {
            setIsBreak(true);
            setMinutes(5);
            setSeconds(0);
            setIsRunning(false);
          }}
          className={`cursor-pointer w-28 px-2 py-2 transition hover:bg-(--dark-blue) ${
            isBreak
              ? "rounded-[15px] bg-(--dark-blue)"
              : "rounded-[15px] bg-(--dark-blue)/50"
          }`}
        >
          Break
        </button>
      </div>

      {/* Timer display */}
      <p className="font-mono text-6xl text-(--dark-blue)">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </p>

      {/* Start button */}
      <button
        onClick={() => setIsRunning((r) => !r)}
        className="w-29.25 rounded-[20px] px-2 py-2 text-(--dark-blue) border-2 border-(--dark-blue) bg-(--pastel-yellow) cursor-pointer"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
    </div>
  );
}
