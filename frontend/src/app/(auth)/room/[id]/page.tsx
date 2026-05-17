"use client";

import Image from "next/image";
import Navbar from "@/components/Navbar";
import PomodoroTimer from "@/components/PomodoroTimer";
import TodoList from "@/components/TodoList";
import { PencilLine, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { type Room } from "@/lib/types";
import { supabase } from "@/supabaseClient";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function Room() {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<Room | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  const roomId = String(useParams().id);

  const getRoomData = async (roomId: string) => {
    // Fetch room data from backend using roomId
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("User not authenticated");
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
        throw new Error("Failed to fetch room data");
      }
      const data = await resp.json();
      setData(data);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
    }
  }

  const getUserProfile = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("User not authenticated");
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const profileData = await resp.json();
      return profileData;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
      return null;
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="flex flex-col xl:flex-row min-h-[calc(100vh-64px)] mt-16">
        {/* Room Content */}
        <div className="w-full xl:w-2/3 flex flex-col items-start p-8 gap-8">
          {/* Room Title */}
          <div className="w-full bg-(--dark-blue) text-white font-mono text-2xl tracking-widest px-8 py-5 rounded-xl flex items-center justify-between">
            {isEditing ? (
              <input
                autoFocus
                value={data?.roomTitle || ""}
                // onChange={(e) => setData({ ...data, roomTitle: e.target.value })}
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

          {/* Author and Room Description */}
          <div className="flex flex-row w-full gap-6 text-(--dark-blue) justify-between items-center">
            <div className="font-mono text-md">
              The room description goes in here.
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
