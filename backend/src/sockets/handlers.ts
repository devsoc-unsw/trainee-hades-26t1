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

async function saveTodosToSupabase(
  todoId: string,
  items: TodoItem[],
  token: string,
): Promise<boolean> {
  try {
    const { error } = await createSupabaseClient(token)
      .from("todos")
      .update({ items })
      .eq("id", todoId);

    if (error) {
      console.error("Failed to save todos:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("saveTodosToSupabase failed:", err);
    return false;
  }
}

export const roomHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room handler with authentication
    socket.on("join-room", async ({ roomId, token }) => {
      console.log("[Handler] join-room received:", { roomId, socketId: socket.id });
      const userId = await getUserFromToken(token);

      if (!userId) {
        console.log("[Handler] Unauthorized join attempt");
        socket.emit("error", { message: "Unauthorized" });
        return; // prevent unauthenticated users coming in
      }

      socket.join(roomId);

      // First user: Fetch from Supabase, else use memory.
      let room = roomStates.get(roomId);
      if (!room) {
        console.log("[Handler] New room, fetching state from DB");
        const { pomodoroState, todoState } = await fetchRoomStateFromSupabase(
          roomId,
          token,
        );
        room = { users: new Set(), pomodoroState, todoState };
        roomStates.set(roomId, room);
        console.log("[Handler] Room initialized with todoState:", todoState ? "yes" : "no");
      } else {
        console.log("[Handler] Existing room found in memory");
      }

      room.users.add(userId);
      socketUsers.set(socket.id, { userId, roomId, token });
      console.log("[Handler] socketUsers entry created for socket:", socket.id);

      console.log("[Handler] Emitting room-state to socket:", socket.id);
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
        console.log("[Handler] add-todo received:", { roomId, item });
        const session = socketUsers.get(socket.id);
        console.log("[Handler] session lookup:", session ? "found" : "NOT FOUND");
        if (!session || session.roomId !== roomId) {
          console.log("[Handler] Authorization failed: socket not in socketUsers or roomId mismatch");
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        console.log("[Handler] room lookup:", room ? "found" : "NOT FOUND");
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Check for duplicates before proceeding
        if (
          room.todoState &&
          room.todoState.items.some((i) => i.id === item.id)
        ) {
          console.log("[Handler] Duplicate todo detected");
          socket.emit("error", { message: "Todo already exists" });
          return;
        }

        // Initialize todoState if it doesn't exist
        if (!room.todoState) {
          console.log("[Handler] Initializing todoState for room:", roomId);
          try {
            const { data, error: insertError } = await createSupabaseClient(
              session.token,
            )
              .from("todos")
              .insert({ room_id: roomId, items: [item] })
              .select()
              .single();

            if (insertError || !data) {
              console.error("add-todo insert failed:", insertError);
              socket.emit("error", {
                message: "Failed to create todo list",
              });
              return;
            }

            room.todoState = {
              id: data.id,
              items: data.items || [item],
            };
            console.log("[Handler] todoState initialized with ID:", room.todoState.id);
          } catch (err) {
            console.error("add-todo insert exception:", err);
            socket.emit("error", { message: "Internal server error" });
            return;
          }
        } else {
          // TodoState exists, add to it
          console.log("[Handler] Adding item to existing todoState");
          room.todoState.items.push(item);
          const saved = await saveTodosToSupabase(
            room.todoState.id,
            room.todoState.items,
            session.token,
          );

          if (!saved) {
            // Revert the in-memory change if save failed
            room.todoState.items.pop();
            console.log("[Handler] Save failed, reverted change");
            socket.emit("error", {
              message: "Failed to save todo",
            });
            return;
          }
        }

        console.log("[Handler] Broadcasting todo-updated to room:", roomId);
        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
      },
    );

    // Remove todo handler
    socket.on(
      "remove-todo",
      async ({ roomId, todoId }: { roomId: string; todoId: string }) => {
        console.log("[Handler] remove-todo received:", { roomId, todoId });
        const session = socketUsers.get(socket.id);
        console.log("[Handler] session lookup:", session ? "found" : "NOT FOUND");
        if (!session || session.roomId !== roomId) {
          console.log("[Handler] Authorization failed");
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room?.todoState) {
          console.log("[Handler] No todoState found");
          socket.emit("error", { message: "No todos to remove" });
          return;
        }

        const initialLength = room.todoState.items.length;
        room.todoState.items = room.todoState.items.filter(
          (i) => i.id !== todoId,
        );

        // If item wasn't found, no-op
        if (room.todoState.items.length === initialLength) {
          console.log("[Handler] Todo not found:", todoId);
          socket.emit("error", { message: "Todo not found" });
          return;
        }

        console.log("[Handler] Saving updated todos to DB");
        const saved = await saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );

        if (!saved) {
          // Revert the in-memory change if save failed
          room.todoState.items = room.todoState.items.concat(
            { id: todoId, text: "", completed: false }, // placeholder
          );
          console.log("[Handler] Save failed, reverted change");
          socket.emit("error", { message: "Failed to remove todo" });
          return;
        }

        console.log("[Handler] Broadcasting todo-updated to room:", roomId);
        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
      },
    );

    // Update todo handler
    socket.on(
      "update-todo",
      async ({
        roomId,
        todoId,
        changes,
      }: {
        roomId: string;
        todoId: string;
        changes: Partial<Omit<TodoItem, "id">>;
      }) => {
        console.log("[Handler] update-todo received:", { roomId, todoId, changes });
        const session = socketUsers.get(socket.id);
        console.log("[Handler] session lookup:", session ? "found" : "NOT FOUND");
        if (!session || session.roomId !== roomId) {
          console.log("[Handler] Authorization failed");
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room?.todoState) {
          console.log("[Handler] No todoState found");
          socket.emit("error", { message: "No todos to update" });
          return;
        }

        const item = room.todoState.items.find((i) => i.id === todoId);
        if (!item) {
          console.log("[Handler] Todo not found:", todoId);
          socket.emit("error", { message: "Todo not found" });
          return;
        }

        // Store original state in case we need to revert
        const originalItem = { ...item };
        console.log("[Handler] Updating item:", { original: originalItem, changes });
        Object.assign(item, changes);

        console.log("[Handler] Saving updated todos to DB");
        const saved = await saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );

        if (!saved) {
          // Revert the in-memory change if save failed
          Object.assign(item, originalItem);
          console.log("[Handler] Save failed, reverted change");
          socket.emit("error", { message: "Failed to update todo" });
          return;
        }

        console.log("[Handler] Broadcasting todo-updated to room:", roomId);
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
