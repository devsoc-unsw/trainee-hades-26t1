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

interface RoomUser {
  userId: string;
  name: string;
  characterId?: string;
}

interface RoomState {
  users: Map<string, RoomUser>;
  hostId: string | null;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
  backgroundId: string;
  customDurations: { pomo: number; short: number; long: number };
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

// ---------------- ROOM LOAD ----------------

async function fetchRoomStateFromSupabase(
  roomId: string,
  token: string,
): Promise<{
  hostId: string | null;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
  backgroundId: string;
  hashPassword: string | null;
}> {
  try {
    const client = createSupabaseClient(token);

    const [pomosResult, todosResult, roomResult, backgroundResult] =
      await Promise.all([
        client
          .from("pomos")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client.from("todos").select("*").eq("room_id", roomId).maybeSingle(),
        client
          .from("rooms")
          .select("created_by, password_hash")
          .eq("id", roomId)
          .single(),
        client
          .from("rooms")
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
      ? {
          id: todosResult.data.id,
          items: todosResult.data.items || [], // Fallback to prevent null array crashes
        }
      : null;

    const hostId = roomResult.data?.created_by || null;
    const backgroundId = backgroundResult.data?.background_id ?? "default";
    const hashPassword = roomResult.data?.password_hash ?? null;

    return { hostId, pomodoroState, todoState, backgroundId, hashPassword };
  } catch (err) {
    console.error("fetchRoomStateFromSupabase failed:", err);
    return {
      hostId: null,
      pomodoroState: null,
      todoState: null,
      backgroundId: "default",
      hashPassword: null,
    };
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

async function saveBackgroundToSupabase(
  roomId: string,
  backgroundId: string,
  token: string,
) {
  const client = createSupabaseClient(token);
  await client
    .from("rooms")
    .update({ background_id: backgroundId })
    .eq("id", roomId);
}

async function deleteRoomMessagesFromSupabase(
  roomId: string,
  token: string,
): Promise<void> {
  try {
    const client = createSupabaseClient(token);
    const { error } = await client
      .from("messages")
      .delete()
      .eq("room_id", roomId);

    if (error) {
      console.error("Failed to delete room messages:", error.message);
    } else {
      console.log(`[Handler] Cleared messages for empty room ${roomId}`);
    }
  } catch (err) {
    console.error("deleteRoomMessagesFromSupabase failed:", err);
  }
}

async function saveMessageToSupabase(
  roomId: string,
  userId: string,
  message: string,
  token: string,
): Promise<{ timestamp: string } | null> {
  try {
    const client = createSupabaseClient(token);
    const { data, error } = await client
      .from("messages")
      .insert({ room_id: roomId, user_id: userId, message })
      .select("created_at")
      .single();

    if (error) {
      console.error("Failed to save message:", error.message);
      return null;
    }
    return { timestamp: data.created_at };
  } catch (err) {
    console.error("saveMessageToSupabase failed:", err);
    return null;
  }
}

export const roomHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", async ({ roomId, token }) => {
      console.log("[Handler] join-room received:", {
        roomId,
        socketId: socket.id,
      });

      const userId = await getUserFromToken(token);
      if (!userId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Ensure the user actually passed the REST API password check
      const client = createSupabaseClient(token);
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("room")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(
          `[Handler] DB Error checking profile for user ${userId}:`,
          profileError,
        );
        socket.emit("error", {
          message: "Server timeout verifying access. Please refresh.",
        });
        return;
      }

      if (String(profile?.room) !== String(roomId)) {
        console.log(
          `[Handler] User ${userId} blocked from socket join (DB mismatch).`,
        );
        socket.emit("error", {
          message: "Access Denied. Please join via the directory.",
        });
        return;
      }

      // Forcibly remove this user from ANY other rooms in memory
      for (const [existingRoomId, existingRoom] of roomStates.entries()) {
        if (existingRoomId !== roomId && existingRoom.users.has(userId)) {
          console.log(
            `[Handler] Sweeping ghost user ${userId} from room ${existingRoomId}`,
          );

          existingRoom.users.delete(userId);
          io.to(existingRoomId).emit("user-left", { userId });

          if (existingRoom.users.size === 0) {
            roomStates.delete(existingRoomId);
          }
        }
      }

      socket.join(roomId);
      let room = roomStates.get(roomId);

      if (!room) {
        const { hostId, pomodoroState, todoState, backgroundId } =
          await fetchRoomStateFromSupabase(roomId, token);
        room = {
          users: new Map(),
          hostId,
          pomodoroState,
          todoState,
          backgroundId,
          customDurations: { pomo: 25, short: 5, long: 15 },
        };
        roomStates.set(roomId, room);
      }

      const { name, characterId } = await getUserProfile(userId, token);
      room.users.set(userId, { userId, name, characterId });
      socketUsers.set(socket.id, { userId, roomId, token });

      // Emit states back to clients
      socket.emit("room-state", {
        users: Array.from(room.users.values()),
        hostId: room.hostId,
        pomodoroState: room.pomodoroState,
        todoState: room.todoState,
        backgroundId: room.backgroundId,
        customDurations: room.customDurations,
      });

      socket.to(roomId).emit("user-joined", { userId, name, characterId });
    });

    socket.on("update-background", async ({ roomId, backgroundId }) => {
      const session = socketUsers.get(socket.id);
      if (!session) return;

      const room = roomStates.get(roomId);
      if (room) room.backgroundId = backgroundId;

      await saveBackgroundToSupabase(roomId, backgroundId, session.token);
      io.to(roomId).emit("background-updated", { backgroundId });
    });

    socket.on(
      "update-character",
      async ({
        roomId,
        characterId,
      }: {
        roomId: string;
        characterId: string;
      }) => {
        const session = socketUsers.get(socket.id);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const user = room.users.get(session.userId);
        if (!user) return;

        user.characterId = characterId;

        io.to(roomId).emit("character-updated", {
          userId: session.userId,
          characterId,
        });

        try {
          const client = createSupabaseClient(session.token);
          const { error } = await client
            .from("profiles")
            .update({ character_id: characterId })
            .eq("id", session.userId);

          if (error) {
            console.error(
              `Failed to save character for user ${session.userId}:`,
              error.message,
            );
            socket.emit("error", {
              message: "Failed to save character to database",
            });
          }
        } catch (err) {
          console.error("update-character DB exception:", err);
        }
      },
    );

    socket.on("leave-room", async ({ roomId, userId }) => {
      const session = socketUsers.get(socket.id);
      socketUsers.delete(socket.id);
      socket.leave(roomId);

      const room = roomStates.get(roomId);
      if (room) {
        room.users.delete(userId);
        if (room.users.size === 0) {
          if (session) {
            await deleteRoomMessagesFromSupabase(roomId, session.token);
          }
          roomStates.delete(roomId);
        } else {
          socket.to(roomId).emit("user-left", { userId });
        }
      }
    });

    // Delete room handler (owner only) — kick everyone in the room live
    socket.on("delete-room", async ({ roomId }) => {
      const session = socketUsers.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const client = createSupabaseClient(session.token);

      // Only the room creator can delete it
      const { data: room, error: fetchError } = await client
        .from("rooms")
        .select("created_by")
        .eq("id", roomId)
        .single();

      if (fetchError || !room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }
      if (room.created_by !== session.userId) {
        socket.emit("error", {
          message: "Only the room creator can delete this room",
        });
        return;
      }

      // Dependent rows are handled by the DB: messages/todos/pomos cascade,
      // and profiles.room is set null on delete.
      const { error: deleteError } = await client
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (deleteError) {
        console.error("Error deleting room:", deleteError);
        socket.emit("error", { message: "Failed to delete room" });
        return;
      }

      // Notify everyone in the room and clear in-memory state
      io.to(roomId).emit("room-deleted", { roomId });
      roomStates.delete(roomId);
      console.log(`[Handler] Room ${roomId} deleted by ${session.userId}`);
    });

    // Add todo handler
    socket.on(
      "add-todo",
      async ({ roomId, item }: { roomId: string; item: TodoItem }) => {
        console.log("[Handler] add-todo received:", { roomId, item });
        const session = socketUsers.get(socket.id);

        if (!session || session.roomId !== roomId) {
          console.log(
            "[Handler] Authorization failed: socket not in socketUsers or roomId mismatch",
          );
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Ensure array isn't null if missing
        if (room.todoState && !room.todoState.items) {
          room.todoState.items = [];
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

        // Initialize todoState if it doesn't exist in memory by fetching the trigger-created row
        if (!room.todoState) {
          console.log(
            "[Handler] Fetching trigger-created todoState for room:",
            roomId,
          );
          try {
            const client = createSupabaseClient(session.token);

            // Fetch existing row created by the DB trigger
            const { data: existingTodo, error: fetchError } = await client
              .from("todos")
              .select("id, items")
              .eq("room_id", roomId)
              .single();

            if (fetchError || !existingTodo) {
              console.error("add-todo fetch existing failed:", fetchError);
              socket.emit("error", {
                message: "Failed to locate room's todo list",
              });
              return;
            }

            // Append item and Update
            const currentItems = existingTodo.items || [];
            currentItems.push(item);

            const { data, error: updateError } = await client
              .from("todos")
              .update({ items: currentItems })
              .eq("id", existingTodo.id)
              .select()
              .single();

            if (updateError || !data) {
              console.error("add-todo update failed:", updateError);
              socket.emit("error", { message: "Failed to save todo list" });
              return;
            }

            room.todoState = {
              id: data.id,
              items: data.items || [],
            };
            console.log(
              "[Handler] todoState loaded and updated with ID:",
              room.todoState.id,
            );
          } catch (err) {
            console.error("add-todo fetch/update exception:", err);
            socket.emit("error", { message: "Internal server error" });
            return;
          }
        } else {
          // TodoState exists in memory, append to it
          console.log("[Handler] Adding item to existing todoState");
          room.todoState.items.push(item);
          const saved = await saveTodosToSupabase(
            room.todoState.id,
            room.todoState.items,
            session.token,
          );

          if (!saved) {
            room.todoState.items.pop(); // Revert on failure
            console.log("[Handler] Save failed, reverted change");
            socket.emit("error", { message: "Failed to save todo" });
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
        const session = socketUsers.get(socket.id);
        if (!session || session.roomId !== roomId) {
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room?.todoState) {
          socket.emit("error", { message: "No todos to remove" });
          return;
        }

        // Failsafe
        if (!room.todoState.items) room.todoState.items = [];

        const initialLength = room.todoState.items.length;
        room.todoState.items = room.todoState.items.filter(
          (i) => i.id !== todoId,
        );

        if (room.todoState.items.length === initialLength) {
          io.to(roomId).emit("todo-updated", { todoState: room.todoState });
          return;
        }

        const saved = await saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );

        if (!saved) {
          room.todoState.items = room.todoState.items.concat({
            id: todoId,
            text: "",
            completed: false,
          });
          socket.emit("error", { message: "Failed to remove todo" });
          return;
        }

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
        const session = socketUsers.get(socket.id);
        if (!session || session.roomId !== roomId) {
          socket.emit("error", { message: "Unauthorized or room mismatch" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room?.todoState) {
          socket.emit("error", { message: "No todos to update" });
          return;
        }

        if (!room.todoState.items) room.todoState.items = [];

        const item = room.todoState.items.find((i) => i.id === todoId);
        if (!item) {
          socket.emit("error", { message: "Todo not found" });
          return;
        }

        const originalItem = { ...item };
        Object.assign(item, changes);

        const saved = await saveTodosToSupabase(
          room.todoState.id,
          room.todoState.items,
          session.token,
        );

        if (!saved) {
          Object.assign(item, originalItem);
          socket.emit("error", { message: "Failed to update todo" });
          return;
        }

        io.to(roomId).emit("todo-updated", { todoState: room.todoState });
      },
    );

    // Send message handler
    socket.on("send-message", async ({ roomId, userId, message }) => {
      const session = socketUsers.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const room = roomStates.get(roomId);
      const name = room?.users.get(userId)?.name ?? "Unknown";
      const timestamp = new Date().toISOString();

      // Broadcast immediately — don't wait for DB
      io.to(roomId).emit("new-message", { userId, name, message, timestamp });

      // Persist in the background
      saveMessageToSupabase(roomId, userId, message, session.token).then(
        (saved) => {
          if (!saved)
            console.error(`[DB] Failed to persist message from ${userId}`);
        },
      );

      console.log(`[Handler] Message from ${name} in room ${roomId}:`, message);
    });

    // Start timer handler
    socket.on("start-timer", async ({ roomId }) => {
      const session = socketUsers.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const room = roomStates.get(roomId);
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      // Initialize pomodoroState if missing by fetching the trigger-created row
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const { data: existingPomo, error: fetchError } = await client
          .from("pomos")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !existingPomo) {
          console.error("Error fetching trigger-created pomos:", fetchError);
          socket.emit("error", { message: "Failed to load timer" });
          return;
        }

        room.pomodoroState = {
          id: existingPomo.id,
          duration: existingPomo.duration,
          status: existingPomo.status,
          mode: existingPomo.mode,
          endTime: existingPomo.end_time,
          remainingTime: existingPomo.remaining_time,
        };
      }

      const timeToAdd =
        room.pomodoroState.remainingTime ||
        room.pomodoroState.duration ||
        25 * 60 * 1000;
      const now = Date.now();
      const endTime = now + timeToAdd;

      room.pomodoroState.status = "running";
      room.pomodoroState.endTime = endTime;

      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      const client = createSupabaseClient(session.token);
      void client
        .from("pomos")
        .update({
          status: "running",
          end_time: new Date(endTime).toISOString(),
        })
        .eq("id", room.pomodoroState.id)
        .then(() => {
          console.log(
            `Updated pomo ${room.pomodoroState?.id} status to running`,
          );
        });
    });

    // Pause timer handler
    socket.on("pause-timer", async ({ roomId }) => {
      const session = socketUsers.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const room = roomStates.get(roomId);
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      // Initialize pomodoroState if missing by fetching the trigger-created row
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const { data: existingPomo, error: fetchError } = await client
          .from("pomos")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !existingPomo) {
          console.error("Error fetching trigger-created pomos:", fetchError);
          socket.emit("error", { message: "Failed to load timer" });
          return;
        }

        room.pomodoroState = {
          id: existingPomo.id,
          duration: existingPomo.duration,
          status: existingPomo.status,
          mode: existingPomo.mode,
          endTime: existingPomo.end_time,
          remainingTime: existingPomo.remaining_time,
        };
      }

      let remainingTime = room.pomodoroState.remainingTime || 0;
      if (
        room.pomodoroState.endTime &&
        room.pomodoroState.status === "running"
      ) {
        const now = Date.now();
        remainingTime = Math.max(0, room.pomodoroState.endTime - now);
      }

      room.pomodoroState.status = "paused";
      room.pomodoroState.remainingTime = remainingTime;
      room.pomodoroState.endTime = null;

      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      const client = createSupabaseClient(session.token);
      void client
        .from("pomos")
        .update({
          status: "paused",
          remaining_time: remainingTime,
          end_time: null,
        })
        .eq("id", room.pomodoroState.id)
        .then(() => {
          console.log(
            `Updated pomo ${room.pomodoroState?.id} status to paused`,
          );
        });
    });

    // Change pomo mode handler
    socket.on("change-pomo-mode", async ({ roomId, mode, durations }) => {
      const session = socketUsers.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const room = roomStates.get(roomId);
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      const validModes = ["pomodoro", "short_break", "long_break"];
      if (!validModes.includes(mode)) {
        socket.emit("error", { message: "Invalid mode" });
        return;
      }

      if (durations) {
        room.customDurations = {
          pomo: durations.pomo || room.customDurations.pomo,
          short: durations.short || room.customDurations.short,
          long: durations.long || room.customDurations.long,
        };
      }

      // Initialize pomodoroState if missing by fetching the trigger-created row
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const { data: existingPomo, error: fetchError } = await client
          .from("pomos")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !existingPomo) {
          console.error("Error fetching trigger-created pomos:", fetchError);
          socket.emit("error", { message: "Failed to load timer" });
          return;
        }

        room.pomodoroState = {
          id: existingPomo.id,
          duration: existingPomo.duration,
          status: existingPomo.status,
          mode: existingPomo.mode,
          endTime: existingPomo.end_time,
          remainingTime: existingPomo.remaining_time,
        };
      }

      const modeToCustomKey: { [key: string]: "pomo" | "short" | "long" } = {
        pomodoro: "pomo",
        short_break: "short",
        long_break: "long",
      };
      const customKey = modeToCustomKey[mode] as "pomo" | "short" | "long";
      const durationMinutes = room.customDurations[customKey];
      const duration = durationMinutes * 60 * 1000;

      room.pomodoroState.mode = mode;
      room.pomodoroState.status = "idle";
      room.pomodoroState.remainingTime = duration;
      room.pomodoroState.duration = duration;
      room.pomodoroState.endTime = null;

      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      const client = createSupabaseClient(session.token);
      void client
        .from("pomos")
        .update({
          mode,
          status: "idle",
          remaining_time: duration,
          duration: duration,
          end_time: null,
        })
        .eq("id", room.pomodoroState.id)
        .then(() => {
          console.log(`Updated pomo ${room.pomodoroState?.id} mode to ${mode}`);
        });
    });

    // Update room details handler
    socket.on(
      "update-room",
      async ({ roomId, roomTitle, description, location }) => {
        const session = socketUsers.get(socket.id);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const room = roomStates.get(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const client = createSupabaseClient(session.token);
        const { data: profileData, error: profileError } = await client
          .from("profiles")
          .select("room")
          .eq("id", session.userId)
          .single();

        if (profileError || !profileData) {
          socket.emit("error", { message: "Profile not found" });
          return;
        }

        if (profileData.room !== roomId) {
          socket.emit("error", {
            message: "You are not a member of this room",
          });
          return;
        }

        const updateData: any = {};
        if (roomTitle !== undefined) updateData.room_title = roomTitle;
        if (description !== undefined) updateData.description = description;
        if (location !== undefined) updateData.location = location;

        if (Object.keys(updateData).length === 0) {
          socket.emit("error", {
            message: "Please provide at least one field to update",
          });
          return;
        }

        const { data: updatedRoom, error: updateError } = await client
          .from("rooms")
          .update(updateData)
          .eq("id", roomId)
          .select(
            "id, roomTitle:room_title, description, location, createdBy:created_by, createdAt:created_at",
          )
          .single();

        if (updateError || !updatedRoom) {
          console.error("Error updating room:", updateError);
          socket.emit("error", { message: "Failed to update room" });
          return;
        }

        io.to(roomId).emit("room-updated", updatedRoom);
      },
    );

    socket.on("disconnect", async () => {
      const session = socketUsers.get(socket.id);

      if (session) {
        const { userId, roomId, token } = session;
        socketUsers.delete(socket.id);

        const room = roomStates.get(roomId);
        if (room) {
          room.users.delete(userId);
          if (room.users.size === 0) {
            await deleteRoomMessagesFromSupabase(roomId, token);
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
