import { Server, Socket } from "socket.io";
import { createSupabaseClient } from "../config/supabase.js";

interface PomodoroState {
  id: string;
  duration: number | null;
  status: string | null;
  mode: string | null;
  endTime: number | null;
  remainingTime: number | null;
}

interface TodoState {
  id: string;
  items: unknown;
}

interface RoomState {
  users: Set<string>;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
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

async function fetchRoomStateFromSupabase(
  roomId: string,
  token: string,
): Promise<{
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
}> {
  const client = createSupabaseClient(token);

  const [pomosResult, todosResult] = await Promise.all([
    client
      .from("pomos")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(), // returns null if no rows (single() errors)
    client.from("todos").select("*").eq("room_id", roomId).maybeSingle(),
  ]);

  const pomodoroState = pomosResult.data
    ? {
        id: pomosResult.data.id,
        duration: pomosResult.data.duration,
        status: pomosResult.data.status,
        mode: pomosResult.data.mode,
        endTime: pomosResult.data.end_time,
        remainingTime: pomosResult.data.remaining_time,
      }
    : null;

  const todoState = todosResult.data
    ? { id: todosResult.data.id, items: todosResult.data.items }
    : null;

  return { pomodoroState, todoState };
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

      // First user: Fetch from Supabase, else use memory.
      let room = roomStates.get(roomId);
      if (!room) {
        const { pomodoroState, todoState } = await fetchRoomStateFromSupabase(
          roomId,
          token,
        );
        room = { users: new Set(), pomodoroState, todoState };
        roomStates.set(roomId, room);
      }

      room.users.add(userId);
      socketUsers.set(socket.id, { userId, roomId });

      socket.emit("room-state", {
        users: Array.from(room.users),
        pomodoroState: room.pomodoroState,
        todoState: room.todoState,
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
