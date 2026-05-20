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

interface RoomUser {
  userId: string;
  name: string;
  characterId?: string;
}

interface RoomState {
  users: Map<string, RoomUser>;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
  backgroundId: string;
}

const roomStates = new Map<string, RoomState>();
const socketUsers = new Map<string, { userId: string; roomId: string; token: string }>();

async function getUserFromToken(token: string): Promise<string | null> {
  try {
    const client = createSupabaseClient(token);
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

async function getUserProfile(userId: string, token: string) {
  try {
    const client = createSupabaseClient(token);
    const { data, error } = await client
      .from("profiles")
      .select("name, character_id")
      .eq("id", userId)
      .single();

    if (error || !data) return { name: "Unknown", characterId: "girl1" };
    return {
      name: data.name as string,
      characterId: (data.character_id as string) ?? "girl1",
    };
  } catch {
    return { name: "Unknown", characterId: "girl1" };
  }
}

async function fetchRoomStateFromSupabase(roomId: string, token: string) {
  const client = createSupabaseClient(token);

  const [pomosResult, todosResult, roomResult] = await Promise.all([
    client.from("pomos")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("todos")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle(),
    client.from("rooms")
      .select("background_id")
      .eq("id", roomId)
      .maybeSingle(),
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

  const backgroundId = roomResult.data?.background_id ?? "default";

  return { pomodoroState, todoState, backgroundId };
}

async function saveBackgroundToSupabase(roomId: string, backgroundId: string, token: string) {
  const client = createSupabaseClient(token);
  await client.from("rooms").update({ background_id: backgroundId }).eq("id", roomId);
}

export const roomHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", async ({ roomId, token }) => {
      const userId = await getUserFromToken(token);
      if (!userId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      socket.join(roomId);

      let room = roomStates.get(roomId);

      if (!room) {
        const { pomodoroState, todoState, backgroundId } =
          await fetchRoomStateFromSupabase(roomId, token);

        room = { users: new Map(), pomodoroState, todoState, backgroundId };
        roomStates.set(roomId, room);
      }

      const { name, characterId } = await getUserProfile(userId, token);

      room.users.set(userId, { userId, name, characterId });
      socketUsers.set(socket.id, { userId, roomId, token });

      socket.emit("room-state", {
        users: Array.from(room.users.values()),
        pomodoroState: room.pomodoroState,
        todoState: room.todoState,
        backgroundId: room.backgroundId,
      });

      socket.to(roomId).emit("user-joined", { userId, name, characterId });

      console.log(`User ${userId} (${name}) joined room ${roomId} with character ${characterId}`);
    });

    socket.on("update-background", async ({ roomId, backgroundId }) => {
      const session = socketUsers.get(socket.id);
      if (!session) return;

      const room = roomStates.get(roomId);
      if (room) room.backgroundId = backgroundId;

      await saveBackgroundToSupabase(roomId, backgroundId, session.token);
      io.to(roomId).emit("background-updated", { backgroundId });
    });

    socket.on("update-character", ({ roomId, characterId }: { roomId: string; characterId: string }) => {
      const session = socketUsers.get(socket.id);
      if (!session) return;

      const room = roomStates.get(roomId);
      if (!room) return;

      const user = room.users.get(session.userId);
      if (!user) return;

      user.characterId = characterId;

      io.to(roomId).emit("room-state", {
        users: Array.from(room.users.values()),
        pomodoroState: room.pomodoroState,
        todoState: room.todoState,
        backgroundId: room.backgroundId,
      });
    });

    socket.on("leave-room", ({ roomId, userId }) => {
      socketUsers.delete(socket.id);
      socket.leave(roomId);

      const room = roomStates.get(roomId);
      if (room) {
        room.users.delete(userId);
        if (room.users.size === 0) {
          roomStates.delete(roomId);
        } else {
          socket.to(roomId).emit("user-left", { userId });
        }
      }
    });

    socket.on("send-message", ({ roomId, userId, message }) => {
      io.to(roomId).emit("new-message", {
        userId,
        message,
        timestamp: new Date().toISOString(),
      });
    });

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
  });
};

export const todoHandler = (io: Server) => {};