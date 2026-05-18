"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import { PencilLine, Check, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { type Room } from "@/lib/types";
import { supabase } from "@/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { getSocket, initSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/FeedbackModal";

export default function Room() {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<Room | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackVariant, setFeedbackVariant] = useState<"success" | "error">("error");

  const roomId = String(useParams().id);
  const router = useRouter();

  // Helper function to show feedback modal
  const showFeedback = (
    title: string,
    description: string,
    variant: "success" | "error" = "error"
  ) => {
    setFeedbackTitle(title);
    setFeedbackDescription(description);
    setFeedbackVariant(variant);
    setFeedbackOpen(true);
  };

  const getRoomData = async (roomId: string) => {
    // Fetch room data from backend using roomId
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        showFeedback("Authentication Error", "User not authenticated. Please log in again.");
        return;
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!resp.ok) {
        showFeedback("Failed to Load Room", "Could not fetch room data. Please try again.");
        return;
      }
      const data = await resp.json();
      setData(data);

    } catch (error) {
      showFeedback("Error", error instanceof Error ? error.message : "An unknown error occurred");
    }
  }

  const getUserProfile = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        showFeedback("Authentication Error", "User not authenticated. Please log in again.");
        return null;
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        showFeedback("Failed to Load Profile", "Could not fetch user profile. Please try again.");
        return null;
      }

      const profileData = await resp.json();
      return profileData;
    } catch (error) {
      showFeedback("Error", error instanceof Error ? error.message : "An unknown error occurred");
      return null;
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
      showFeedback("Error", error instanceof Error ? error.message : "An unknown error occurred");
    }
  };

  const handleLeaveRoom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const currentUserId = session?.user.id;

      if (!token || !currentUserId) {
        showFeedback("Authentication Error", "User not authenticated. Please log in again.");
        return;
      }

      // Emit leave-room event via socket
      const socket = getSocket();
      socket.emit("leave-room", { roomId, userId: currentUserId });

      // Clear the user's room field in profile
      const clearRoomResp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room: null }),
      });

      if (!clearRoomResp.ok) {
        const errorResp = await clearRoomResp.json();
        showFeedback("Failed to Leave Room", errorResp.error || "Could not leave the room.");
        return;
      }

      showFeedback("Room Left", "You have successfully left the room.", "success");
      // Navigate after a brief delay to let user see the success message
      setTimeout(() => {
        router.push("/rooms");
      }, 1500);
    } catch (error) {
      showFeedback("Error", error instanceof Error ? error.message : "Failed to leave room");
    }
  };

  useEffect(() => {
    getRoomData(roomId);
  }, [roomId]);

  useEffect(() => {
    if (data?.createdBy) {
      getUserProfile(data.createdBy).then((profile) => {
        if (profile) {
          setCreatedBy(profile.name);
        }
      });
    }
  }, [data?.createdBy]);

  useEffect(() => {
    if (!isEditing && data) {
      updateRoomData({ ...data });
    }
  }, [isEditing]);

  useEffect(() => {
    const reconnect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const socket = initSocket(token, roomId);

      // Listen for room updates from other users or this user
      socket.on("room-updated", (updatedRoom) => {
        console.log("Room updated:", updatedRoom);
        setData(updatedRoom);
      });

      if (socket.connected) {
        socket.emit("join-room", { roomId: String(roomId), token });
      }
      // if not connected yet, initSocket's internal `connect` listener handles it
    };

    reconnect();

    return () => {
      // clean up room-specific listeners on unmount
      // but don't disconnect — socket is a singleton
      const socket = getSocket();
      socket.off("room-state");
      socket.off("room-updated");
      socket.off("error");
    };
  }, [roomId]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="flex flex-col xl:flex-row min-h-[calc(100vh-64px)] mt-16">
        {/* Room Content */}
        <div className="w-full xl:w-2/3 flex flex-col items-start p-8 gap-8">
          <div className="w-full h-15 flex items-center gap-2 text-2xl">
            {/* Room Title */}
            <div className="w-full h-full bg-(--dark-blue) text-white font-mono text-2xl tracking-widest px-8 py-5 rounded-xl flex items-center justify-between">
              {isEditing ? (
                <input
                  autoFocus
                  value={data?.roomTitle || ""}
                  onChange={(e) => {
                    setData(prev => prev ? { ...prev, roomTitle: e.target.value } : prev)
                  }}
                  maxLength={30}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                  className="bg-transparent border-b border-white/50 outline-none w-full"
                />
              ) : (
                <span>{data?.roomTitle}</span>
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
            <Button onClick={handleLeaveRoom} variant="outline" className="flex items-center min-w-16 h-full text-3xl cursor-pointer">
              <LogOut
                size={24}
              />
            </Button>
          </div>

          {/* Author and Room Description */}
          <div className="flex flex-row w-full gap-6 text-(--dark-blue) justify-between items-center">
            <div className="font-mono text-md">
              {data?.description || ""}
            </div>
            <div className="bg-(--pastel-yellow) border-2 border-(--dark-blue) rounded-xl p-2">
              Created by: <span className="font-semibold">{createdBy || "Unknown"}</span>
            </div>
          </div>

          {/* Study Nook */}
          <div className="flex-1 relative w-full min-h-96 bg-(--light-blue) border-4 border-(--dark-blue) rounded-xl overflow-hidden">
            <Image
              src="/studyroom.png"
              alt="study room image placeholder"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>

        {/* Productivity Tools (Pomdoro and Todo-List) */}
        <div className="w-full xl:w-1/3 flex flex-col gap-8 p-8">
          <PomodoroTimer roomId={roomId} />
          <TodoList />
          {/* Chat Feature: To-be-implemented? */}
          <div className="flex-1 bg-(--light-blue) border-4 border-(--dark-blue) text-(--dark-blue) rounded-[30px] p-6">
            Welcome to your Study Nook!
          </div>
        </div>
      </main>

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        title={feedbackTitle}
        description={feedbackDescription}
        actionLabel={feedbackVariant === "success" ? "Continue" : "Dismiss"}
        variant={feedbackVariant}
      />
    </div>
  );
}
