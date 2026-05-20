"use client";

import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import RoomCard from "@/components/RoomCard";
import Loading from "@/components/Loading";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/supabaseClient";
import { pixelify, poppins } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Feedback } from "@/lib/types";
import { backgrounds } from "@/lib/backgrounds";

interface Room {
  id: number;
  roomTitle: string;
  description: string;
  location: string;
  createdAt: string;
  createdBy: string;
  backgroundId?: string;
}

const getFallbackBackground = (id: number) =>
  (backgrounds[id % backgrounds.length] ?? backgrounds[0]).src;

const getRoomBackground = (room: Room) => {
  if (room.backgroundId) {
    const bg = backgrounds.find(b => b.id === room.backgroundId);
    if (bg) return bg.src;
  }
  return getFallbackBackground(room.id);
};

export default function Rooms() {
  const [filter, setFilter] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomLocation, setNewRoomLocation] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // ---------------- FILTER ----------------
  useEffect(() => {
    setFilteredRooms(
      rooms.filter((room) =>
        room.roomTitle.toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [filter, rooms]);

  useEffect(() => {
    setFilter("");
  }, []);

  // ---------------- CREATE ROOM ----------------
  const handleCreateRoom = async (title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setFeedback({
          open: true,
          title: "Authentication required",
          description: "You must be logged in to create a room.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomTitle: title,
            description: newRoomDescription,
            location: newRoomLocation,
          }),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json();
        setFeedback({
          open: true,
          title: "Failed to create room",
          description: errorData.error,
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      setIsModalOpen(false);
      setNewRoomTitle("");
      setNewRoomDescription("");
      setNewRoomLocation("");

      setFeedback({
        open: true,
        title: "Room created",
        description: "Your room has been created successfully.",
        actionLabel: "Close",
        variant: "success",
      });

      await handleGetRooms();
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- GET ROOMS ----------------
  const handleGetRooms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await resp.json();

      setRooms(data);
      setFilteredRooms(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- SWITCH ROOM ----------------
  const leaveRoomAndJoin = async (roomId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId }),
      });

      router.push(`/room/${roomId}`);
      setFeedback(null);
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        title: "Failed to switch rooms",
        description: "Please try again.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  };

  // ---------------- JOIN ROOM ----------------
  const handleJoinRoom = async (roomId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      const profileResp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const profileData = await profileResp.json();

      // already in same room
      if (profileData.room === roomId) {
        router.push(`/room/${roomId}`);
        return;
      }

      // already in another room → confirm modal
      if (profileData.room) {
        setFeedback({
          open: true,
          title: "Already in a room",
          description: "Leave your current room and join this one?",
          actionLabel: "Leave & Join",
          cancelLabel: "Cancel",
          variant: "warning",
          onAction: () => leaveRoomAndJoin(roomId),
        });

        return;
      }

      // direct join
      await leaveRoomAndJoin(roomId);
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        title: "Failed to join room",
        description: "An unknown error occurred.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  };

  useEffect(() => {
    handleGetRooms();
  }, []);

  // ---------------- UI ----------------
  return (
    <div className="pt-18 overflow-x-hidden">
      <Navbar />

      <main className="px-10 py-8">
        {loading ? (
          <Loading />
        ) : (
          <>
            <div className="flex justify-between">
              <FilterBar value={filter} onChange={setFilter} />

              <Button onClick={() => setIsModalOpen(true)}>
                + New Room
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  name={room.roomTitle}
                  location={room.location}
                  imageUrl={getRoomBackground(room)}
                  onClick={() => handleJoinRoom(room.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* FEEDBACK MODAL */}
      <FeedbackModal
        open={feedback?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
        title={feedback?.title ?? ""}
        description={feedback?.description ?? ""}
        actionLabel={feedback?.actionLabel ?? "Close"}
        variant={feedback?.variant ?? "success"}
        onAction={feedback?.onAction}
        cancelLabel={feedback?.cancelLabel}
      />

      {/* CREATE ROOM MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn(poppins.className)}>
          <DialogHeader>
            <DialogTitle className={pixelify.className}>
              Create Room
            </DialogTitle>
            <DialogDescription>
              Enter details below
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateRoom(newRoomTitle);
            }}
          >
            <input
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              placeholder="Title"
            />

            <textarea
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Description"
            />

            <input
              value={newRoomLocation}
              onChange={(e) => setNewRoomLocation(e.target.value)}
              placeholder="Location"
            />

            <DialogFooter>
              <Button type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>

              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}