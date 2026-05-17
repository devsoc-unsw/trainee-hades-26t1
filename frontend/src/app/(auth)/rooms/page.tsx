"use client";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import RoomCard from "@/components/RoomCard";
import { useState } from "react";
import { useEffect } from "react";
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
import { supabase } from '@/supabaseClient';
import { pixelify, poppins } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "@/components/FeedbackModal";
import { getSocket } from "@/lib/socket";


interface Room {
  id: number;
  roomTitle: string;
  description: string;
  location: string;
  createdAt: string;
  createdBy: string;
}

export default function Rooms() {
  const [filter, setFilter] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomLocation, setNewRoomLocation] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setFilteredRooms(
      rooms.filter(
        (room) =>
          room.roomTitle.toLowerCase().includes(filter.toLowerCase()),
      ),
    );
  }, [filter]);

  useEffect(() => {
    setFilter("");
  }, []);

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

      const newRoom = {
        roomTitle: title,
        description: newRoomDescription,
        location: newRoomLocation
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newRoom)
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json();
        console.error("Error creating room:", errorData.error);
        setFeedback({
          open: true,
          title: "Failed to create room",
          description: errorData.error || "An unknown error occurred while creating the room.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const data = await resp.json();
      setIsModalOpen(false);
      setNewRoomTitle("");
      setNewRoomDescription("");
      setNewRoomLocation("");

      setFeedback({
        open: true,
        title: "Room created successfully",
        description: "The room has been created successfully.",
        actionLabel: "Close",
        variant: "success",
      });

      await handleGetRooms();
    } catch (error) {
      console.error("Error creating room:", error);
      setFeedback({
        open: true,
        title: "Failed to create room",
        description: "An unknown error occurred while creating the room.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  }

  const handleGetRooms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setFeedback({
          open: true,
          title: "Authentication required",
          description: "You must be logged in to view rooms.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json();
        console.error("Error fetching rooms:", errorData.error);
        setFeedback({
          open: true,
          title: "Failed to fetch rooms",
          description: errorData.error || "An unknown error occurred while fetching rooms.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const data = await resp.json();
      console.log("Rooms fetched successfully:", data);
      setRooms(data);
      setFilteredRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setFeedback({
        open: true,
        title: "Failed to fetch rooms",
        description: "An unknown error occurred while fetching rooms.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  }

  const handleJoinRoom = async (roomId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setFeedback({
          open: true,
          title: "Authentication required",
          description: "You must be logged in to join a room.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const socket = getSocket();

      // Emit join-room event with roomId and token
      socket.emit("join-room", { roomId: String(roomId), token });

      // Listen for room-state event (successful join)
      socket.once("room-state", (data) => {
        console.log("Successfully joined room:", data);
        setFeedback({
          open: true,
          title: "Room joined successfully",
          description: "Navigating to the room...",
          actionLabel: "Close",
          variant: "success",
        });
        // Navigate to the room page
        router.push(`/room/${roomId}`);
      });

      // Listen for error event
      socket.once("error", (error) => {
        console.error("Error joining room:", error);
        setFeedback({
          open: true,
          title: "Failed to join room",
          description: error.message || "An error occurred while joining the room.",
          actionLabel: "Close",
          variant: "error",
        });
      });

      // Set a timeout to clean up listeners if no response
      const timeout = setTimeout(() => {
        socket.off("room-state");
        socket.off("error");
      }, 30000);

      // Clean up timeout on successful response
      socket.once("room-state", () => clearTimeout(timeout));
      socket.once("error", () => clearTimeout(timeout));
    } catch (error) {
      console.error("Error joining room:", error);
      setFeedback({
        open: true,
        title: "Failed to join room",
        description: "An unknown error occurred while joining the room.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  }

  useEffect(() => {
    handleGetRooms();
  }, []);

  return (
    <div className="pt-18 overflow-x-hidden">
      <Navbar />
      <main className="px-10 py-8">
        <div className="flex justify-between items-center">
          <FilterBar value={filter} onChange={setFilter} />
          <Button
            variant="outline"
            className="text-(--dark-blue) hover:text-(--dark-blue) border-(--dark-blue) border-2 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            + New Room
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8">
          {filteredRooms.map((room) => (
            <RoomCard
              id={room.id}
              key={room.id}
              name={room.roomTitle}
              location={room.location}
              onClick={() => handleJoinRoom(room.id)}
            />
          ))}
        </div>
      </main>

      {/* Feedback */}
      <FeedbackModal
        open={feedback?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setFeedback(null);
          }
        }}
        title={feedback?.title ?? ""}
        description={feedback?.description ?? ""}
        actionLabel={feedback?.actionLabel ?? "Close"}
        variant={feedback?.variant ?? "success"}
      />

      {/* Create room modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn(poppins.className, "bg-(--light-blue) border-(--dark-blue)/15 rounded-lg p-6")}>
          <DialogHeader>
            <DialogTitle className={`text-3xl font-bold text-(--dark-blue) ${pixelify.className}`}>Create New Room</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Enter a title, description, and location for your new room
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newRoomTitle.trim()) {
                handleCreateRoom(newRoomTitle);
              }
            }}
          >
            <div className="flex flex-col gap-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Title
                </label>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="Enter room title"
                  className="bg-(--dark-blue)/50 w-full px-4 py-2 border border-(--dark-blue) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Description
                </label>
                <textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Enter room description"
                  className="bg-(--dark-blue)/50 w-full max-h-32 px-4 py-2 border border-(--dark-blue) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newRoomLocation}
                  onChange={(e) => setNewRoomLocation(e.target.value)}
                  placeholder="Enter room location"
                  className="bg-(--dark-blue)/50 w-full px-4 py-2 border border-(--dark-blue) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-4 bg-transparent border-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setNewRoomTitle("");
                  setNewRoomDescription("");
                  setNewRoomLocation("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-(--dark-blue) hover:bg-blue-600 text-white">
                Create Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
