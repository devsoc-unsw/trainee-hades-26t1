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
import { initSocket } from "@/lib/socket";
import { Feedback } from "@/lib/types";
import { backgrounds } from "@/lib/backgrounds";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";

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
    const bg = backgrounds.find((b) => b.id === room.backgroundId);
    if (bg) return bg.src;
  }
  return getFallbackBackground(room.id);
};

export default function Rooms() {
  const [filter, setFilter] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const filteredRooms = rooms.filter((room) =>
    room.roomTitle.toLowerCase().includes(filter.toLowerCase())
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomLocation, setNewRoomLocation] = useState("");
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [newRoomPassword, setNewRoomPassword] = useState<string | null>(null);
  const [showNewRoomPassword, setShowNewRoomPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setFilter("");
  }, []);

  const handleCreateRoom = async (title: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        location: newRoomLocation,
        password: newRoomIsPrivate ? newRoomPassword : null,
      };

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newRoom),
        },
      );

      if (!resp.ok) {
        const errorData = await resp.json();
        setFeedback({
          open: true,
          title: "Failed to create room",
          description:
            errorData.error ||
            "An unknown error occurred while creating the room.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      setIsModalOpen(false);
      setNewRoomTitle("");
      setNewRoomDescription("");
      setNewRoomLocation("");
      setNewRoomIsPrivate(false);
      setNewRoomPassword(null);
      setShowNewRoomPassword(false);

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
  };

  const handleGetRooms = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setFeedback({
          open: true,
          title: "Authentication required",
          description: "You must be logged in to view rooms.",
          actionLabel: "Close",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        setFeedback({
          open: true,
          title: "Failed to fetch rooms",
          description:
            errorData.error ||
            "An unknown error occurred while fetching rooms.",
          actionLabel: "Close",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      const data = await resp.json();
      setRooms(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setFeedback({
        open: true,
        title: "Failed to fetch rooms",
        description: "An unknown error occurred while fetching rooms.",
        actionLabel: "Close",
        variant: "error",
      });
      setLoading(false);
    }
  };

  // Leaves current room and joins new one
  // Leaves current room and joins new one
  const leaveAndJoin = async (newRoomId: number, oldRoomId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // 1. Explicitly emit leave-room for the old room (This fixes the ghost user bug!)
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("leave-room", {
          roomId: String(oldRoomId),
          userId: session.user.id
        });
      }

      // 2. Update profile to the new room via REST
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ room: newRoomId }), // Put them directly in the new room
      });

      // 3. Route! (The Room.tsx component will mount and handle socket initialization)
      router.push(`/room/${newRoomId}`);
    } catch (error) {
      console.error("Error switching rooms:", error);
      setFeedback({
        open: true,
        title: "Failed to switch rooms",
        description: "Please try again.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  };

  const handleJoinRoom = async (roomId: number) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

      const profileResp = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!profileResp.ok) {
        const errorData = await profileResp.json();
        setFeedback({
          open: true,
          title: "Failed to fetch profile",
          description:
            errorData.error ||
            "An unknown error occurred while fetching your profile.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const profileData = await profileResp.json();

      // Already in this room
      if (profileData.room === roomId) {
        router.push(`/room/${roomId}`);
        return;
      }

      // Already in another room — show confirm dialog
      if (profileData.room) {
        setFeedback({
          open: true,
          title: "Already in a room",
          description: "Leave your current room and join this one?",
          actionLabel: "Leave & Join",
          cancelLabel: "Cancel",
          variant: "warning",
          onAction: () => leaveAndJoin(roomId, profileData.room),
        });
        return;
      }

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ room: roomId }),
      });
      router.push(`/room/${roomId}`);
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
  };

  useEffect(() => {
    handleGetRooms();
  }, []);

  return (
    <div className="pt-18 overflow-x-hidden">
      <Navbar />
      <main className="px-10 py-8">
        {loading ? (
          <div className="flex justify-center items-center min-h-96">
            <Loading />
          </div>
        ) : (
          <>
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
                  imageUrl={getRoomBackground(room)}
                  onClick={() => handleJoinRoom(room.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            poppins.className,
            "w-full min-w-sm sm:min-w-lg bg-(--light-blue) border-(--dark-blue)/15 rounded-lg p-6",
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={`text-3xl font-bold text-(--dark-blue) ${pixelify.className}`}
            >
              Create New Room
            </DialogTitle>
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
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 mb-6">
              <div className="flex min-w-0 flex-col gap-3">
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
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private
                  </label>
                  <div className="flex flex-col gap-3 bg-(--dark-blue)/50 w-full min-h-24 px-4 py-2 border border-(--dark-blue) rounded-lg">
                    <div className="flex gap-3">
                      <Switch
                        checked={newRoomIsPrivate}
                        onCheckedChange={setNewRoomIsPrivate}
                        size="default"
                        className="data-checked:bg-(--dark-blue)"
                      />
                      <span className="text-sm">
                        {newRoomIsPrivate ? "Private room" : "Public room"}
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {newRoomIsPrivate
                        ? "You need to share your password for others to join"
                        : "Anyone can join"}
                    </span>
                  </div>
                </div>
                {newRoomIsPrivate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewRoomPassword ? "text" : "password"}
                        value={newRoomPassword ?? ""}
                        onChange={(e) => setNewRoomPassword(e.target.value)}
                        placeholder="Enter room password"
                        className="bg-(--dark-blue)/50 w-full px-4 py-2 pr-12 border border-(--dark-blue) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowNewRoomPassword((current) => !current)
                        }
                        aria-label={
                          showNewRoomPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-600 hover:text-(--dark-blue)"
                      >
                        {showNewRoomPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
                  setNewRoomIsPrivate(false);
                  setNewRoomPassword(null);
                  setShowNewRoomPassword(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-(--dark-blue) hover:bg-blue-600 text-white"
              >
                Create Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
