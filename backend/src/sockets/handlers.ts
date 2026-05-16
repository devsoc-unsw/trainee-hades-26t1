import { Server, Socket } from "socket.io";
import { createSupabaseClient } from "../config/supabase.js";

interface RoomState {
  users: Set<string>;
}

const roomStates = new Map<string, RoomState>();
const socketUsers = new Map<string, { userId: string; roomId: string }>();

async function getUserFromToken(token: string): Promise<string | null> {
  try {
    const client = createSupabaseClient(token);
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

function getOrCreateRoom(roomId: string): RoomState {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, { users: new Set() });
  }
  return roomStates.get(roomId)!;
}

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room handler with authentication
    socket.on("join-room", async ({ roomId, token }) => {
      const userId = await getUserFromToken(token);

      if (!userId) {
        socket.emit("error", { message: "Unauthorized" });
        return; // prevent unauthenticated users coming in
      }

      socket.join(roomId);
      const room = getOrCreateRoom(roomId);
      room.users.add(userId);
      socketUsers.set(socket.id, { userId, roomId });
      socket.emit("room-state", {
        users: Array.from(room.users),
      });

      socket.to(roomId).emit("user-joined", { userId });

      console.log(`Authenticated user ${userId} joined room ${roomId}`);
    });

    // Leave room handler
    socket.on(
      "leave-room",
      ({ roomId, userId }: { roomId: string; userId: string }) => {
        socketUsers.delete(socket.id);
        socket.leave(roomId);

        const room = roomStates.get(roomId);
        if (room) {
          room.users.delete(userId);

          if (room.users.size === 0) {
            roomStates.delete(roomId);
            console.log(`Room ${roomId} is empty, cleaned up`);
          } else {
            socket.to(roomId).emit("user-left", { userId });
          }
        }
      },
    );

    // Send message handler
    socket.on(
      "send-message",
      ({
        roomId,
        userId,
        message,
      }: {
        roomId: string;
        userId: string;
        message: string;
      }) => {
        io.to(roomId).emit("new-message", {
          userId,
          message,
          timestamp: new Date().toISOString(),
        });
      },
    );

    // Disconnect handler
    socket.on("disconnect", () => {
      const session = socketUsers.get(socket.id);
      if (session) {
        const { userId, roomId } = session;
        socketUsers.delete(socket.id);

        const room = roomStates.get(roomId);
        if (room) {
          room.users.delete(userId);

          if (room.users.size === 0) {
            roomStates.delete(roomId);
          } else {
            socket.to(roomId).emit("user-left", { userId });
          }
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });

    // Message handler example
    // socket.on("message", (data) => {
    //   console.log(`Message from ${socket.id}:`, data);
    //   io.emit("message", { id: socket.id, ...data });
    // });
  });
};

export const todoHandler = (io: Server) => {
  // todo-related events
};

export const roomHandler = (io: Server) => {
  // join-room
};
