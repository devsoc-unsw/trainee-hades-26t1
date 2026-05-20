"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import ChatBox from "@/components/ChatBox";
import { PencilLine, Check, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { type Room, type TodoState } from "@/lib/types";
import { supabase } from "@/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { getSocket, initSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/FeedbackModal";
import CharacterAnimation from "@/components/CharacterAnimation";
import { backgrounds } from "@/lib/backgrounds";
import type { RoomUser } from "@/lib/types";
import { characters, type Character } from "@/lib/characters";

export default function Room() {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<Room | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(backgrounds[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]);
  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackVariant, setFeedbackVariant] = useState<"success" | "error">(
    "error",
  );
  const [todoState, setTodoState] = useState<TodoState | null>(null);

  const roomId = String(useParams().id);
  const router = useRouter();

  const handleCharacterChange = async (c: Character) => {
    setSelectedCharacter(c);
    setShowCharacterPicker(false);

    const socket = getSocket();
    socket.emit("update-character", { roomId, characterId: c.id });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ character_id: c.id }),
      });
    } catch {
      setFeedbackDescription("Failed to save character. Please try again.");
      setFeedbackVariant("error");
      setFeedbackTitle("Error");
      setFeedbackOpen(true);
    }
  };

  // Helper function to show feedback modal
  const showFeedback = (
    title: string,
    description: string,
    variant: "success" | "error" = "error",
  ) => {
    setFeedbackTitle(title);
    setFeedbackDescription(description);
    setFeedbackVariant(variant);
    setFeedbackOpen(true);
  };

  const getRoomData = async (roomId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated");

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) throw new Error("Failed to fetch room data");

      const roomData = await resp.json();
      setData(roomData);

      // Load saved background
      if (roomData.backgroundId) {
        const bg = backgrounds.find((b) => b.id === roomData.backgroundId);
        if (bg) setSelectedBg(bg);
      }
    } catch (error) {
      showFeedback(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const getSavedCharacter = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!resp.ok) return;

      const profile = await resp.json();
      if (profile.character_id) {
        const c = characters.find((ch) => ch.id === profile.character_id);
        if (c) setSelectedCharacter(c);
      }
    } catch {
      // silently fail, default character is fine
    }
  };

  const getUserProfile = async (userId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated");

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${userId}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) throw new Error("Failed to fetch user profile");

      return await resp.json();
    } catch (error) {
      showFeedback(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred",
      );
      return null;
    }
  };

  const getRoomUsers = async (roomId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("User not authenticated");

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}/users`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) {
        const errorResp = await resp.json();
        throw new Error(errorResp.error || "Failed to fetch room users");
      }

      const usersData = await resp.json();
      setRoomUsers(usersData);
    } catch (error) {
      showFeedback(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  };

  const updateRoomData = (updatedData: Room) => {
    try {
      const socket = getSocket();

      if (!socket.connected) {
        showFeedback("Error", "Socket not connected. Please refresh the page.");
        return;
      }

      // Emit update-room event with only the fields to update
      socket.emit("update-room", {
        roomId,
        roomTitle: updatedData.roomTitle,
        description: updatedData.description,
        location: updatedData.location,
      });
    } catch (error) {
      console.error("Update room data error:", error);
      showFeedback(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  };

  const handleLeaveRoom = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const currentUserId = session?.user.id;
      if (!token || !currentUserId) throw new Error("User not authenticated");

      const socket = getSocket();
      socket.emit("leave-room", { roomId, userId: currentUserId, token });

      const clearRoomResp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ room: null }),
        },
      );

      if (!clearRoomResp.ok) {
        const errorResp = await clearRoomResp.json();
        showFeedback(
          "Failed to Leave Room",
          errorResp.error || "Could not leave the room.",
        );
        return;
      }

      showFeedback(
        "Room Left",
        "You have successfully left the room.",
        "success",
      );
      // Navigate after a brief delay to let user see the success message
      setTimeout(() => {
        router.push("/rooms");
      }, 1500);
    } catch (error) {
      showFeedback(
        "Error",
        error instanceof Error ? error.message : "Failed to leave room",
      );
    }
  };

  const handleBgChange = async (bg: (typeof backgrounds)[0]) => {
    setSelectedBg(bg);
    setShowPicker(false);

    const socket = getSocket();
    socket.emit("update-background", { roomId, backgroundId: bg.id });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ backgroundId: bg.id }),
        },
      );
    } catch {
      setFeedbackDescription("Failed to save background. Please try again.");
      setFeedbackVariant("error");
      setFeedbackTitle("Error");
      setFeedbackOpen(true);
    }
  };

  const getTodoState = async (roomId: string) => {
    // Fetch todo state from backend using roomId
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("User not authenticated");
      }

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}/todos`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!resp.ok) {
        throw new Error("Failed to fetch todo state");
      }
      const data = await resp.json();
      console.log("[RoomPage] Fetched todoState from REST API:", data);
      setTodoState(data);
    } catch (error) {
      console.error("[RoomPage] Error fetching todo state:", error);
      // Don't show error toast for todos - it's optional data
    }
  };

  useEffect(() => {
    getRoomData(roomId);
    getSavedCharacter();
    getTodoState(roomId);
    getRoomUsers(roomId);
  }, [roomId]);

  useEffect(() => {
    if (data?.createdBy) {
      getUserProfile(data.createdBy).then((profile) => {
        if (profile) setCreatedBy(profile.name);
      });
    }
  }, [data?.createdBy]);

  useEffect(() => {
    if (!isEditing && data) {
      isInitialLoadRef.current = false;
    }
  }, [isEditing, data]);

  useEffect(() => {
    const reconnect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const socket = initSocket(token, roomId);

      // Listen for room updates from other users or this user
      socket.on("room-updated", (updatedRoom) => {
        setData(updatedRoom);
      });

      // Handle room state initialization from socket
      socket.on(
        "room-state",
        (state: {
          users: string[];
          pomodoroState: any;
          todoState: TodoState | null;
        }) => {
          console.log("[RoomPage] Received room-state from socket:", state);
          setTodoState(state.todoState);
        },
      );

      // Handle real-time todo updates from socket
      socket.on("todo-updated", (data: { todoState: TodoState }) => {
        console.log("[RoomPage] Received todo-updated from socket:", data);
        setTodoState(data.todoState);
      });

      if (socket.connected) {
        socket.emit("join-room", { roomId, token });
      }

      socket.on(
        "room-state",
        (state: { users: RoomUser[]; backgroundId?: string }) => {
          setRoomUsers(state.users);
          if (state.backgroundId) {
            const bg = backgrounds.find((b) => b.id === state.backgroundId);
            if (bg) setSelectedBg(bg);
          }
        },
      );

      socket.on(
        "user-joined",
        ({ userId, name }: { userId: string; name: string }) => {
          setRoomUsers((prev) => {
            if (prev.find((u) => u.userId === userId)) return prev;
            return [...prev, { userId, name }];
          });
        },
      );

      socket.on("user-left", ({ userId }: { userId: string }) => {
        setRoomUsers((prev) => prev.filter((u) => u.userId !== userId));
      });

      socket.on(
        "background-updated",
        ({ backgroundId }: { backgroundId: string }) => {
          const bg = backgrounds.find((b) => b.id === backgroundId);
          if (bg) setSelectedBg(bg);
        },
      );
    };

    reconnect();

    return () => {
      const socket = getSocket();
      socket.off("room-state");
      socket.off("todo-updated");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("background-updated");
      socket.off("room-updated");
      socket.off("error");
    };
  }, [roomId]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {loading ? (
        <main className="flex items-center justify-center min-h-[calc(100vh-64px)] mt-16">
          <Loading />
        </main>
      ) : (
        <main className="flex flex-col min-h-[calc(100vh-64px)] xl:h-[calc(100vh-64px)] mt-16">
          {/* Columns Wrapper */}
          <div className="flex flex-col xl:flex-row w-full xl:flex-1 xl:min-h-0">
            {/* Room Content */}
            <div className="w-full xl:w-2/3 flex flex-col items-start p-4 sm:p-6 xl:p-8 gap-3 sm:gap-4">
              {/* Title Row */}
              <div className="w-full flex items-center gap-2">
                <div className="w-full bg-(--dark-blue) text-white font-mono text-base sm:text-xl xl:text-2xl tracking-widest px-4 sm:px-6 xl:px-8 py-3 sm:py-4 xl:py-5 rounded-xl flex items-center justify-between">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={data?.roomTitle || ""}
                      onChange={(e) =>
                        setData((prev) =>
                          prev ? { ...prev, roomTitle: e.target.value } : prev,
                        )
                      }
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setIsEditing(false);
                          if (data) updateRoomData(data);
                        }
                      }}
                      className="bg-transparent border-b border-white/50 outline-none w-full"
                    />
                  ) : (
                    <span className="truncate pr-2">{data?.roomTitle}</span>
                  )}

                  {isEditing ? (
                    <Check
                      size={20}
                      className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete shrink-0"
                      onClick={() => {
                        setIsEditing(false);
                        if (data) {
                          updateRoomData(data);
                        }
                      }}
                    />
                  ) : (
                    <PencilLine
                      size={20}
                      className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete shrink-0"
                      onClick={() => setIsEditing(true)}
                    />
                  )}
                </div>
                <Button
                  onClick={handleLeaveRoom}
                  variant="outline"
                  className="flex items-center min-w-10 sm:min-w-14 h-full cursor-pointer shrink-0 border-2 border-(--dark-blue)"
                >
                  <LogOut size={20} />
                </Button>
              </div>

              {/* Author and Room Description */}
              <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-6 text-(--dark-blue) sm:justify-between sm:items-center">
                <div className="font-mono text-sm">
                  {data?.description || ""}
                </div>
                <div className="bg-(--pastel-yellow) border-2 border-(--dark-blue) rounded-xl p-2 text-sm self-start sm:self-auto whitespace-nowrap">
                  Created by:{" "}
                  <span className="font-semibold">
                    {createdBy || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Study Nook — fixed height on mobile, flex-1 on xl */}
              <div className="relative w-full h-55 sm:h-75 xl:h-auto xl:flex-1 bg-(--light-blue) border-4 border-(--dark-blue) rounded-xl overflow-hidden">
                <Image
                  src={selectedBg.src}
                  alt="study room background"
                  fill
                  priority
                  className="object-cover"
                />
                <CharacterAnimation users={roomUsers} />
              </div>

              {/* Picker Row */}
              <div className="flex flex-wrap gap-3 items-start justify-start w-full">
                {/* Background picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
                  >
                    Background
                  </button>

                  <div
                    className={`absolute bottom-full left-0 mb-2 z-10 origin-bottom transition-all duration-200 ease-out ${
                      showPicker
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 scale-95 translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="bg-(--dark-blue) border-2 border-white/20 rounded-xl p-3 flex flex-col gap-2">
                      {backgrounds.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col items-center gap-1"
                        >
                          <Image
                            src={b.src}
                            alt={b.label}
                            width={80}
                            height={56}
                            onClick={() => handleBgChange(b)}
                            className={`w-16 sm:w-20 h-12 sm:h-14 object-cover rounded-xl cursor-pointer border-2 ${
                              selectedBg.id === b.id
                                ? "border-white"
                                : "border-transparent hover:border-white/50"
                            }`}
                          />
                          <span className="text-white font-mono text-xs">
                            {b.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Character picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowCharacterPicker(!showCharacterPicker)}
                    className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
                  >
                    Character
                  </button>

                  <div
                    className={`absolute bottom-full left-0 mb-2 z-10 origin-bottom transition-all duration-200 ease-out ${
                      showCharacterPicker
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 scale-95 translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="bg-(--dark-blue) border-2 border-white/20 rounded-xl p-3 flex flex-col gap-2">
                      {characters.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col items-center gap-1"
                        >
                          <div
                            onClick={() => handleCharacterChange(c)}
                            className={`w-12 sm:w-16 h-16 sm:h-20 rounded cursor-pointer border-2 shrink-0 ${
                              selectedCharacter.id === c.id
                                ? "border-white"
                                : "border-transparent"
                            }`}
                            style={{
                              backgroundImage: `url(${c.src})`,
                              backgroundRepeat: "no-repeat",
                              backgroundSize: "auto 100%",
                              backgroundPosition: "0px 0px",
                              imageRendering: "pixelated",
                            }}
                          />
                          <span className="text-white text-xs">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Productivity Tools (Pomodoro and Todo-List) */}
            <div className="w-full xl:w-1/3 flex flex-col gap-8 p-8 xl:min-h-0 xl:overflow-y-auto">
              <PomodoroTimer roomId={roomId} />
              <TodoList roomId={roomId} todoState={todoState} />
              <ChatBox roomId={roomId} roomUsers={roomUsers} />
            </div>
          </div>
        </main>
      )}

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open);
          if (!open) {
            setFeedbackTitle("");
            setFeedbackDescription("");
          }
        }}
        title={feedbackTitle}
        description={feedbackDescription}
        variant={feedbackVariant}
        actionLabel="Close"
      />
    </div>
  );
}
