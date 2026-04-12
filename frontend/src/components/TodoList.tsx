"use client";
import { useState } from "react";
import { Trash2, Check, Plus } from "lucide-react";

export default function TodoList() {
  const [tasks, setTasks] = useState<{ text: string; completed: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");

  const addTask = () => {
    if (!input.trim()) return;
    setTasks([...tasks, { text: input.trim(), completed: false }]);
    setInput("");
  };

  const toggleTask = (i: number) => {
    setTasks(
      tasks.map((task, idx) =>
        idx === i ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (i: number) => {
    setTasks(tasks.filter((_, idx) => idx !== i));
  };

  return (
    <div className="w-106.25 bg-(--pastel-yellow) rounded-[30px] border-4 border-(--dark-blue) p-6 flex flex-col gap-3">
      <div className="flex items-center gap-4 mx-1">
        <input
          type="text"
          placeholder="Add a new task!"
          className="font-mono flex-1 bg-transparent text-(--dark-blue) placeholder-opacity-50 border-b-2 border-(--dark-blue) outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button
          className="bg-(--dark-blue) text-white rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer"
          onClick={addTask}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-64">
        {tasks.map((task, i) => (
          <div
            key={i}
            className={`flex items-center justify-between bg-(--dark-blue) text-white rounded-[15px] px-4 py-3 ${
              task.completed ? "opacity-50" : ""
            }`}
          >
            <span
              className={`font-mono ${task.completed ? "line-through" : ""}`}
            >
              {task.text}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleTask(i)}
                className="cursor-pointer text-white hover:opacity-50 transition-opacity duration-150"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => deleteTask(i)}
                className="cursor-pointer text-white hover:opacity-50 transition-opacity duration-150"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
