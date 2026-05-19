"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import ChatBox from "@/components/ChatBox";
import { PencilLine, Check, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Room } from "@/lib/types";
import { supabase } from "@/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSocket, initSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
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

  const roomId = String(useParams().id);
  const router = useRouter();

  const handleCharacterChange = (c: Character) => {
    setSelectedCharacter(c);
    setShowCharacterPicker(false);

    const socket = getSocket();
    socket.emit("update-character", {
      roomId,
      characterId: c.id,
    });
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
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
      toast.error(error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  };

  const updateRoomData = useCallback(
    async (updatedData: Room) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("User not authenticated");

        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedData),
          },
        );

        if (!resp.ok) {
          const errorResp = await resp.json();
          throw new Error(errorResp.error || "Failed to update room data");
        }

        const updatedRoom = await resp.json();
        setData(updatedRoom);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unknown error");
      }
    },
    [roomId],
  );

  const handleLeaveRoom = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const currentUserId = session?.user.id;
      if (!token || !currentUserId) throw new Error("User not authenticated");

      const socket = getSocket();
      socket.emit("leave-room", { roomId, userId: currentUserId });

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
        throw new Error(errorResp.error || "Failed to leave room");
      }

      toast.success("Left room successfully");
      router.push("/rooms");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave room",
      );
    }
  };

  const handleBgChange = (bg: (typeof backgrounds)[0]) => {
    setSelectedBg(bg);
    setShowPicker(false);
    const socket = getSocket();
    socket.emit("update-background", { roomId, backgroundId: bg.id });
  };

  useEffect(() => {
    getRoomData(roomId);
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
      updateRoomData({ ...data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, updateRoomData]);

  useEffect(() => {
    const reconnect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const socket = initSocket(token, roomId);

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
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("background-updated");
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
        <main className="flex flex-col xl:flex-row min-h-[calc(100vh-64px)] mt-16">
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
                    onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                    className="bg-transparent border-b border-white/50 outline-none w-full"
                  />
                ) : (
                  <span className="truncate pr-2">{data?.roomTitle}</span>
                )}

                {isEditing ? (
                  <Check
                    size={20}
                    className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete shrink-0"
                    onClick={() => setIsEditing(false)}
                  />
                ) : (
                  <PencilLine
                    size={20}
                    className="cursor-pointer opacity-60 hover:opacity-100 hover:scale-110 transition-discrete hrink-0"
                    onClick={() => setIsEditing(true)}
                  />
                )}
              </div>
              <Button
                onClick={handleLeaveRoom}
                variant="outline"
                className="flex items-center min-w-10 sm:min-w-14 h-full cursor-pointer shrink-0"
              >
                <LogOut size={20} />
              </Button>
            </div>

            {/* Author and Room Description */}
            <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-6 text-(--dark-blue) sm:justify-between sm:items-center">
              <div className="font-mono text-sm">{data?.description || ""}</div>
              <div className="bg-(--pastel-yellow) border-2 border-(--dark-blue) rounded-xl p-2 text-sm self-start sm:self-auto whitespace-nowrap">
                Created by:{" "}
                <span className="font-semibold">{createdBy || "Unknown"}</span>
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
              <div className="flex items-start gap-2">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
                >
                  Background
                </button>

                {showPicker && (
                  <div className="bg-(--dark-blue) border-2 border-(--dark-blue) rounded-xl p-3 flex gap-2 flex-wrap max-w-65 sm:max-w-none">
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
                )}
              </div>

              {/* Character picker */}
              <button
                onClick={() => setShowCharacterPicker((v) => !v)}
                className="bg-(--dark-blue) text-white font-mono text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
              >
                Character
              </button>

              {showCharacterPicker && (
                <div className="w-full bg-(--dark-blue) border-2 rounded-xl p-3 flex gap-2 flex-wrap">
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
              )}
            </div>
          </div>

          {/* Chat Box! */}
          <div className="w-full xl:w-1/3 flex flex-col gap-6 xl:gap-8 p-4 sm:p-6 xl:p-8">
            <PomodoroTimer />
            <TodoList />
            <ChatBox roomId={roomId} roomUsers={roomUsers} />
          </div>
        </main>
      )}
    </div>
  );
}
