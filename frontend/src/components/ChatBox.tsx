"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, MessageSquare } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      behavior: "auto",
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
    <div
      className={`w-full bg-(--light-blue) border-4 border-(--dark-blue) rounded-[30px] p-6 flex flex-col transition-[gap] duration-300 ease-in-out ${
        isCollapsed ? "gap-0" : "gap-4"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <h2 className="text-(--dark-blue) font-(family-name:--font-pixelify) font-bold text-lg tracking-widest text-center flex items-center gap-2">
          <MessageSquare size={20} />
          Chat
        </h2>
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          className="absolute right-0 text-(--dark-blue) hover:opacity-50 cursor-pointer"
        >
          <ChevronUp
            size={20}
            className={`transition-transform duration-300 ease-in-out ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden flex flex-col gap-4 min-h-0">
          <div
            ref={scrollRef}
            className="bg-white border-2 border-(--dark-blue) rounded-[20px] p-4 flex flex-col gap-2 min-h-64 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-3 [&::-webkit-scrollbar-thumb]:bg-(--dark-blue) [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:bg-clip-padding"
          >
            {messages.map((msg, i) => {
              const isOwn = msg.userId === currentUserId;
              if (isOwn) {
                return (
                  <div key={i} className="flex justify-end">
                    <span className="font-mono text-sm text-(--dark-blue) bg-gray-100 border-2 border-(--dark-blue)/20 rounded-2xl px-3 py-1 max-w-[80%] wrap-break-word">
                      {msg.message}
                    </span>
                  </div>
                );
              }
              return (
                <div key={i} className="flex justify-start">
                  <span className="font-mono text-sm text-white bg-(--dark-blue) border-2 border-(--dark-blue) rounded-2xl px-3 py-1 max-w-[80%] wrap-break-word">
                    <span className="font-bold">
                      {getSenderName(msg.userId)}:{" "}
                    </span>
                    {msg.message}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-white border-2 border-(--dark-blue) rounded-[15px] px-4 py-2">
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
              className="bg-(--dark-blue) text-white rounded-lg w-20 h-8 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="18"
                viewBox="0 0 25 23"
                fill="none"
              >
                <path
                  d="M5.07917 18.8471H9.4875V21.0833H2.875V12.1388H5.07917V18.8471ZM13.8958 18.8471H9.4875V16.611H13.8958V18.8471ZM18.3042 16.611H13.8958V14.3749H18.3042V16.611ZM22.7125 14.3749H18.3042V12.1388H22.7125V14.3749ZM11.6917 12.1388H5.07917V9.9027H11.6917V12.1388ZM24.9167 12.1388H22.7125V9.9027H24.9167V12.1388ZM9.4875 3.19436H5.07917V9.9027H2.875V0.958252H9.4875V3.19436ZM22.7125 9.9027H18.3042V7.66659H22.7125V9.9027ZM18.3042 7.66659H13.8958V5.43047H18.3042V7.66659ZM13.8958 5.43047H9.4875V3.19436H13.8958V5.43047Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
