"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { supabase } from "@/supabaseClient";
import type { RoomUser } from "@/lib/types";

type ChatMessage = {
  userId: string;
  message: string;
  timestamp: string;
};

type ChatBoxProps = {
  roomId: string;
  roomUsers: RoomUser[];
};

export default function ChatBox({ roomId, roomUsers }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || !currentUserId) return;

    const socket = getSocket();
    socket.emit("send-message", {
      roomId,
      userId: currentUserId,
      message: trimmed,
    });
    setInput("");
  };

  const getSenderName = (userId: string) => {
    return roomUsers.find((u) => u.userId === userId)?.name ?? "Unknown";
  };

  return (
    <div className="w-full bg-(--light-blue) border-4 border-(--dark-blue) rounded-[30px] p-6 flex flex-col gap-4">
      <h2 className="text-(--dark-blue) font-mono text-lg tracking-widest text-center">
        Chat
      </h2>

      <div
        ref={scrollRef}
        className="bg-white rounded-[20px] p-4 flex flex-col gap-2 h-64 overflow-y-auto"
      >
        {messages.map((msg, i) => {
          const isOwn = msg.userId === currentUserId;
          return (
            <div
              key={i}
              className={`font-mono text-sm text-(--dark-blue) ${
                isOwn ? "text-right" : "text-left"
              }`}
            >
              <span className="font-bold">{getSenderName(msg.userId)}:</span>{" "}
              {msg.message}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-white rounded-[15px] px-4 py-2">
        <input
          type="text"
          placeholder="Send a message"
          className="font-mono flex-1 bg-transparent text-(--dark-blue) outline-none text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-(--dark-blue) text-white rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
