"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import { PencilLine, Check } from "lucide-react";
import { useState } from "react";

export default function Room() {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("COMP6080 Chapel");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="flex h-[calc(100vh-64px)] mt-16">
        {/* Room Content */}
        <div className="w-3/4 flex flex-col items-start p-6 gap-6">
          {/* Room Title */}
          <div className="w-full bg-(--dark-blue) text-white font-mono text-2xl tracking-widest px-8 py-5 rounded-xl flex items-center justify-between">
            {isEditing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={30}
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                className="bg-transparent border-b border-white/50 outline-none w-full"
              />
            ) : (
              <span>{title}</span>
            )}

            {isEditing ? (
              <Check
                size={24}
                className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete"
                onClick={() => setIsEditing(false)}
              />
            ) : (
              <PencilLine
                size={24}
                className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete"
                onClick={() => setIsEditing(true)}
              />
            )}
          </div>

          {/* Author and Room Description */}
          <div className="flex flex-row w-full gap-6 text-(--dark-blue) justify-between items-center">
            <div className="font-mono text-md">
              The room description goes in here.
            </div>
            <div className="bg-(--pastel-yellow) border-2 border-(--dark-blue) rounded-xl p-2">
              Created by: <span className="font-semibold">SleepyJen</span>
            </div>
          </div>

          {/* Study Nook */}
          <div className="flex-1 relative w-full bg-(--light-blue) border-4 border-(--dark-blue) rounded-xl overflow-hidden">
            <Image
              src="/studyroom.png"
              alt="study room image placeholder"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Productivity Tools (Pomdoro and Todo-List) */}
        <div className="w-1/4 flex flex-col gap-6 p-6">
          <PomodoroTimer />
          <TodoList />
          {/* Chat Feature: To-be-implemented? */}
          <div className="flex-1 bg-(--light-blue) border-4 border-(--dark-blue) text-(--dark-blue) rounded-[30px] p-6">
            Welcome to your Study Nook!
          </div>
        </div>
      </main>
    </div>
  );
}
