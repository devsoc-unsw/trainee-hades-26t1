"use client";
import { useState, useEffect } from "react";
import { Trash2, Check, Plus } from "lucide-react";
import { getSocket } from "@/lib/socket";
import type { TodoState, TodoItem } from "@/lib/types";

interface TodoListProps {
  roomId: string;
  todoState: TodoState | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function TodoList({ roomId, todoState }: TodoListProps) {
  const [localTodos, setLocalTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");

  // Sync local state with todoState from props
  useEffect(() => {
    if (todoState?.items) {
      setLocalTodos(todoState.items);
    }
  }, [todoState?.items]);

  // Listen for todo updates from socket
  useEffect(() => {
    const socket = getSocket();
    console.log("[TodoList] Socket connected:", socket.connected, "Socket ID:", socket.id);

    const handleTodoUpdated = (data: { todoState: TodoState }) => {
      console.log("[TodoList] Received todo-updated event:", data);
      setLocalTodos(data.todoState.items);
    };

    const handleError = (error: any) => {
      console.error("[TodoList] Socket error:", error);
    };

    socket.on("todo-updated", handleTodoUpdated);
    socket.on("error", handleError);

    return () => {
      socket.off("todo-updated", handleTodoUpdated);
      socket.off("error", handleError);
    };
  }, []);

  const addTask = () => {
    if (!input.trim()) return;

    const socket = getSocket();
    const newTodo: TodoItem = {
      id: generateId(),
      text: input.trim(),
      completed: false,
    };

    console.log("[TodoList] Emitting add-todo:", { roomId, item: newTodo });
    socket.emit("add-todo", { roomId, item: newTodo });
    setInput("");
  };

  const toggleTask = (todoId: string) => {
    const socket = getSocket();
    const todo = localTodos.find((t) => t.id === todoId);

    if (todo) {
      console.log("[TodoList] Emitting update-todo:", {
        roomId,
        todoId,
        changes: { completed: !todo.completed },
      });
      socket.emit("update-todo", {
        roomId,
        todoId,
        changes: { completed: !todo.completed },
      });
    }
  };

  const deleteTask = (todoId: string) => {
    const socket = getSocket();
    console.log("[TodoList] Emitting remove-todo:", { roomId, todoId });
    socket.emit("remove-todo", { roomId, todoId });
  };

  return (
    <div className="w-full bg-(--pastel-yellow) rounded-[30px] border-4 border-(--dark-blue) p-6 flex flex-col gap-3">
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
        {localTodos.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between bg-(--dark-blue) text-white rounded-[15px] px-4 py-3 ${task.completed ? "opacity-50" : ""
              }`}
          >
            <span
              className={`font-mono ${task.completed ? "line-through" : ""}`}
            >
              {task.text}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleTask(task.id)}
                className="cursor-pointer text-white hover:opacity-50 transition-opacity duration-150"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => deleteTask(task.id)}
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
