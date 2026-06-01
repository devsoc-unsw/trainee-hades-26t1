"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import ChatBox from "@/components/ChatBox";
import { PencilLine, Check, LogOut, Users, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { type Room, type TodoState } from "@/lib/types";
import { supabase } from "@/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { getSocket, initSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/FeedbackModal";
import CharacterAnimation from "@/components/CharacterAnimation";
import { backgrounds } from "@/lib/backgrounds";
import { characters, type Character } from "@/lib/characters";
import { RoomUser } from "@/components/CharacterWalkLogic";
import { click2 } from "@/lib/sounds";

const playClick2 = click2("/sounds/singleClicks01.wav");

interface RoomStatePayload {
  users: RoomUser[];
  pomodoroState: unknown;
  todoState: TodoState | null;
  backgroundId?: string;
}

interface FeedbackState {
  open: boolean;
  title: string;
  description: string;
  variant: "success" | "error" | "warning";
  actionLabel?: string;
  cancelLabel?: string;
  onAction?: () => void | Promise<void>;
}

export default function Room() {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<Room | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(backgrounds[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]);
  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    title: "",
    description: "",
    variant: "error",
  });

  const [todoState, setTodoState] = useState<TodoState | null>(null);

  const roomId = String(useParams().id);
  const router = useRouter();

  const showFeedback = (
    title: string,
    description: string,
    variant: "success" | "error" = "error",
  ) => {
    setFeedback({ open: true, title, description, variant });
  };

  const handleCharacterChange = (c: Character) => {
    setSelectedCharacter(c);
    setShowCharacterPicker(false);

    const socket = getSocket();
    if (!socket) {
      showFeedback("Error", "Socket not initialised. Please refresh the page.");
      return;
    }
    if (socket.connected) {
      socket.emit("update-character", { roomId, characterId: c.id });
    } else {
      showFeedback(
        "Error",
        "Disconnected. Please refresh to change character.",
      );
    }
  };

  const updateRoomData = (updatedData: Room) => {
    try {
      const socket = getSocket();
      if (!socket) {
        showFeedback(
          "Error",
          "Socket not initialised. Please refresh the page.",
        );
        return;
      }
      if (!socket.connected) {
        showFeedback("Error", "Socket not connected. Please refresh the page.");
        return;
      }

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
      if (socket) {
        socket.emit("leave-room", { roomId, userId: currentUserId, token });
      }

      const clearRoomResp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ room: null, password: null }),
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

  const handleDeleteRoom = () => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      showFeedback("Error", "Disconnected. Please refresh and try again.");
      return;
    }
    socket.emit("delete-room", { roomId });
  };

  const confirmDeleteRoom = () => {
    setFeedback({
      open: true,
      title: "Delete this room?",
      description:
        "This room and its chat and todos will be permanently deleted. This cannot be undone.",
      variant: "warning",
      actionLabel: "Delete",
      cancelLabel: "Cancel",
      onAction: handleDeleteRoom,
    });
  };

  const handleBgChange = async (bg: (typeof backgrounds)[0]) => {
    setSelectedBg(bg);
    setShowPicker(false);

    const socket = getSocket();
    if (!socket) {
      showFeedback("Error", "Socket not initialised. Please refresh the page.");
      return;
    }
    socket.emit("update-background", { roomId, backgroundId: bg.id });
  };

  const fetchRoomData = async (roomId: string, token: string) => {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        showFeedback(
          "Access Denied",
          "This is a private room. Please join from the directory.",
          "error",
        );
        setTimeout(() => router.push("/rooms"), 2000);
        return;
      }
      throw new Error("Failed to fetch room data");
    }
    const roomData = await resp.json();
    setData(roomData);
    if (roomData.backgroundId) {
      const bg = backgrounds.find((b) => b.id === roomData.backgroundId);
      if (bg) setSelectedBg(bg);
    }

    if (roomData.createdBy) {
      const profileResp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${roomData.createdBy}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (profileResp.ok) {
        const profile = await profileResp.json();
        setCreatedBy(profile.name);
      }
    }
  };

  const fetchSavedCharacter = async (token: string) => {
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (resp.ok) {
        const profile = await resp.json();
        if (profile.character_id) {
          const c = characters.find((ch) => ch.id === profile.character_id);
          if (c) setSelectedCharacter(c);
        }
      }
    } catch {
      // silently fail — default character is fine
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        if (isMounted) showFeedback("Error", "User not authenticated");
        return;
      }

      if (isMounted) setCurrentUserId(session?.user.id ?? null);

      try {
        await Promise.all([
          fetchRoomData(roomId, token),
          fetchSavedCharacter(token),
        ]);

        if (isMounted) {
          setLoading(false);
          isInitialLoadRef.current = false;
        }

        const socket = initSocket(token, roomId);

        socket.on("room-state", (state: RoomStatePayload) => {
          setRoomUsers(state.users);
          setTodoState(state.todoState);
          if (state.backgroundId) {
            const bg = backgrounds.find((b) => b.id === state.backgroundId);
            if (bg) setSelectedBg(bg);
          }
        });

        socket.on("room-updated", (updatedRoom: Room) => {
          setData(updatedRoom);
        });

        socket.on("todo-updated", (data: { todoState: TodoState }) => {
          setTodoState(data.todoState);
        });

        socket.on("user-joined", ({ userId, name, characterId }: RoomUser) => {
          setRoomUsers((prev) => {
            if (prev.find((u) => u.userId === userId)) return prev;
            return [...prev, { userId, name, characterId }];
          });
        });

        socket.on(
          "character-updated",
          ({
            userId,
            characterId,
          }: {
            userId: string;
            characterId: string;
          }) => {
            setRoomUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.userId === userId ? { ...user, characterId } : user,
              ),
            );
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

        // The owner deleted this room — kick everyone inside.
        socket.on("room-deleted", () => {
          showFeedback(
            "Room Deleted",
            "This room has been deleted.",
            "success",
          );
          setTimeout(() => router.push("/rooms"), 1500);
        });

        const emitJoin = () => socket.emit("join-room", { roomId, token });
        if (socket.connected) {
          emitJoin();
        } else {
          socket.once("connect", emitJoin);
        }
      } catch (err: unknown) {
        if (isMounted) {
          showFeedback(
            "Error",
            err instanceof Error ? err.message : "An unknown error occurred",
          );
        }
      }
    };

    initializePage();

    return () => {
      isMounted = false;
      const socket = getSocket();
      if (socket) {
        socket.off("room-state");
        socket.off("room-updated");
        socket.off("todo-updated");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("background-updated");
        socket.off("character-updated");
        socket.off("room-deleted");
        socket.off("error");
        socket.off("connect");
      }
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
          <div className="flex flex-col xl:flex-row w-full xl:flex-1 xl:min-h-0">
            {/* Room Content */}
            <div className="w-full xl:w-2/3 flex flex-col items-start p-4 sm:p-6 xl:p-8 gap-3 sm:gap-4">
              {/* Title Row */}
              <div className="w-full flex items-stretch gap-2">
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
                        if (data) updateRoomData(data);
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
                  className="flex items-center justify-center h-auto w-16 self-stretch cursor-pointer shrink-0 rounded-xl border-2 border-(--dark-blue)"
                >
                  <LogOut size={20} className="text-(--dark-blue)" />
                </Button>
              </div>

              {/* Author and Room Description */}
              <div className="flex flex-col sm:flex-row w-full gap-6 sm:gap-6 text-(--dark-blue) sm:justify-between sm:items-center">
                <div className="font-mono text-sm">
                  {data?.description || ""}
                </div>
                <div className="flex items-center gap-4 self-start sm:self-auto">
                  {/* Live Viewer Count */}
                  <div
                    className="flex items-center gap-1.5 text-sm font-mono whitespace-nowrap"
                    title={`${roomUsers.length} ${roomUsers.length === 1 ? "viewer" : "viewers"} in this room`}
                  >
                    <Users size={20} className="text-(--dark-blue)" />
                    <span className="font-semibold tabular-nums">
                      {roomUsers.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-(--pastel-yellow) border-2 border-(--dark-blue) rounded-xl p-2 text-sm whitespace-nowrap">
                    Created by:{" "}
                    <span className="font-semibold">
                      {createdBy || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Study Nook */}
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
                    onClick={() => {
                      playClick2();
                      setShowPicker(!showPicker);
                    }}
                    className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacit cursor-pointer"
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
                    onClick={() => {
                      playClick2();
                      setShowCharacterPicker(!showCharacterPicker);
                    }}
                    className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacity cursor-pointer"
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
                    <div className="bg-(--dark-blue) border-2 border-white/20 rounded-xl p-3 overflow-y-auto max-h-131 flex flex-col character-picker-scroll">
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

                {/* Delete room (owner only) */}
                {currentUserId && data?.createdBy === currentUserId && (
                  <button
                    aria-label="Delete Room"
                    onClick={() => {
                      playClick2();
                      confirmDeleteRoom();
                    }}
                    className="ml-auto group flex items-center justify-end overflow-hidden bg-transparent text-rose-500/80 border-2 border-rose-300 font-mono text-xs px-3 py-2 rounded-xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors cursor-pointer"
                  >
                    <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-30 group-hover:opacity-100 group-hover:mr-2">
                      Delete Room
                    </span>
                    <Trash2 size={14} className="shrink-0" />
                  </button>
                )}
              </div>
            </div>

            {/* Productivity Tools */}
            <div className="w-full xl:w-1/3 flex flex-col gap-8 p-8 xl:min-h-0 xl:overflow-y-auto">
              <PomodoroTimer roomId={roomId} />
              <TodoList roomId={roomId} todoState={todoState} />
              <ChatBox roomId={roomId} roomUsers={roomUsers} />
            </div>
          </div>
        </main>
      )}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => {
          if (!open)
            setFeedback((prev) => ({
              ...prev,
              open: false,
              title: "",
              description: "",
            }));
        }}
        title={feedback.title}
        description={feedback.description}
        variant={feedback.variant}
        actionLabel={feedback.actionLabel ?? "Close"}
        cancelLabel={feedback.cancelLabel}
        onAction={feedback.onAction}
      />
    </div>
  );
}
