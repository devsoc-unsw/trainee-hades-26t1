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

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  id: string;
  items: TodoItem[];
}

interface RoomState {
  users: Set<string>;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
}

const roomStates = new Map<string, RoomState>();
const socketUsers = new Map<
  string,
  { userId: string; roomId: string; token: string }
>();

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
  try {
    const client = createSupabaseClient(token);

    const [pomosResult, todosResult] = await Promise.all([
      client
        .from("pomos")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
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
  } catch (err) {
    console.error("fetchRoomStateFromSupabase failed:", err);
    return { pomodoroState: null, todoState: null };
  }
}

function saveTodosToSupabase(todoId: string, items: TodoItem[], token: string) {
  createSupabaseClient(token)
    .from("todos")
    .update({ items })
    .eq("id", todoId)
    .then(({ error }) => {
      if (error) console.error("Failed to save todos:", error.message);
    });
}

export const roomHandler = (io: Server) => {
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
      socketUsers.set(socket.id, { userId, roomId, token });

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

    // Add todo handler
    socket.on(
      "add-todo",
      async ({ roomId, item }: { roomId: string; item: TodoItem }) => {
        const session = socketUsers.get(socket.id);
        if (!session || session.roomId !== roomId) return;

        const room = roomStates.get(roomId);
        if (!room) return;

        if (!room.todoState) {
          // placeholder to prevent concurrent adds from double-inserting
          room.todoState = { id: "", items: [item] };

              let data, insertError;
          try {
            ({ data, error: insertError } = await createSupabaseClient(session.token)
              .from("todos")
              .insert({ room_id: roomId, items: room.todoState.items })
              .select()
              .single());
          } catch (err) {
            console.error("add-todo insert failed:", err);
            room.todoState = null;
            return;
          }

          if (insertError || !data) {
            room.todoState = null;
            return;
          }
          room.todoState.id = data.id;
        } else {
          if (room.todoState.items.some((i) => i.id === item.id)) return;
          room.todoState.items.push(item);
          saveTodosToSupabase(
            room.todoState.id,
            room.todoState.items,
            session.token,
          );
        }

        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
      },
    );

    // Remove todo handler
    socket.on(
      "remove-todo",
      ({ roomId, todoId }: { roomId: string; todoId: string }) => {
        const session = socketUsers.get(socket.id);
        if (!session || session.roomId !== roomId) return;

        const room = roomStates.get(roomId);
        if (!room?.todoState) return;

        room.todoState.items = room.todoState.items.filter(
          (i) => i.id !== todoId,
        );
        saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );
        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
      },
    );

    // Update todo handler
    socket.on(
      "update-todo",
      ({
        roomId,
        todoId,
        changes,
      }: {
        roomId: string;
        todoId: string;
        changes: Partial<Omit<TodoItem, "id">>;
      }) => {
        const session = socketUsers.get(socket.id);
        if (!session || session.roomId !== roomId) return;

        const room = roomStates.get(roomId);
        if (!room?.todoState) return;

        const item = room.todoState.items.find((i) => i.id === todoId);
        if (!item) return;

        Object.assign(item, changes);
        saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );
        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
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
  });
};
