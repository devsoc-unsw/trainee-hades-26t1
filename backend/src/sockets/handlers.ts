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
        client.from("rooms").select("created_by").eq("id", roomId).single(),
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
      ? { id: todosResult.data.id, items: todosResult.data.items }
      : null;

    const hostId = roomResult.data?.created_by || null;
    const backgroundId = backgroundResult.data?.background_id ?? "default";

    return { hostId, pomodoroState, todoState, backgroundId };
  } catch (err) {
    console.error("fetchRoomStateFromSupabase failed:", err);
    return {
      hostId: null,
      pomodoroState: null,
      todoState: null,
      backgroundId: "default",
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
        console.log("[Handler] Unauthorized join attempt");
        socket.emit("error", { message: "Unauthorized" });
        return;
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
        console.log(
          "[Handler] Room initialized with todoState:",
          todoState ? "yes" : "no",
        );
      } else {
        console.log("[Handler] Existing room found in memory");
      }

      const { name, characterId } = await getUserProfile(userId, token);

      room.users.set(userId, { userId, name, characterId });
      socketUsers.set(socket.id, { userId, roomId, token });

      // Update profile to reflect room membership
      const client = createSupabaseClient(token);
      const { error: profileError } = await client
        .from("profiles")
        .update({ room: roomId })
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile with room:", profileError);
        socket.emit("error", { message: "Failed to update profile" });
        return;
      }

      console.log("[Handler] Emitting room-state to socket:", socket.id);
      socket.emit("room-state", {
        users: Array.from(room.users.values()),
        hostId: room.hostId,
        pomodoroState: room.pomodoroState,
        todoState: room.todoState,
        backgroundId: room.backgroundId,
      });

      socket.to(roomId).emit("user-joined", { userId, name, characterId });

      console.log(
        `User ${userId} (${name}) joined room ${roomId} with character ${characterId}`,
      );
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
      ({ roomId, characterId }: { roomId: string; characterId: string }) => {
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

    // Add todo handler
    socket.on(
      "add-todo",
      async ({ roomId, item }: { roomId: string; item: TodoItem }) => {
        console.log("[Handler] add-todo received:", { roomId, item });
        const session = socketUsers.get(socket.id);
        console.log(
          "[Handler] session lookup:",
          session ? "found" : "NOT FOUND",
        );
        if (!session || session.roomId !== roomId) {
          console.log(
            "[Handler] Authorization failed: socket not in socketUsers or roomId mismatch",
          );
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
            console.log(
              "[Handler] todoState initialized with ID:",
              room.todoState.id,
            );
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
        console.log(
          "[Handler] session lookup:",
          session ? "found" : "NOT FOUND",
        );
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

        // If item wasn't found, it was already removed (race condition) - just sync state
        if (room.todoState.items.length === initialLength) {
          console.log(
            "[Handler] Todo already removed (race condition):",
            todoId,
          );
          // Broadcast current state so all users stay synced
          io.to(roomId).emit("todo-updated", { todoState: room.todoState });
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
        console.log("[Handler] update-todo received:", {
          roomId,
          todoId,
          changes,
        });
        const session = socketUsers.get(socket.id);
        console.log(
          "[Handler] session lookup:",
          session ? "found" : "NOT FOUND",
        );
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
        console.log("[Handler] Updating item:", {
          original: originalItem,
          changes,
        });
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

    // Send message handler
    socket.on(
      "send-message",
      async ({
        roomId,
        userId,
        message,
      }: {
        roomId: string;
        userId: string;
        message: string;
      }) => {
        const session = socketUsers.get(socket.id);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const saved = await saveMessageToSupabase(
          roomId,
          userId,
          message,
          session.token,
        );

        const room = roomStates.get(roomId);
        const name = room?.users.get(userId)?.name ?? "Unknown";

        io.to(roomId).emit("new-message", {
          userId,
          name,
          message,
          timestamp: saved?.timestamp ?? new Date().toISOString(),
        });
      },
    );

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

      // Host Bouncer Check
      if (session.userId !== room.hostId) {
        socket.emit("error", { message: "Only host can control timer" });
        return;
      }

      // Initialize pomodoroState if it doesn't exist
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const defaultDuration = 25 * 60 * 1000; // 25 minutes in ms

        const { data: newPomo, error: createError } = await client
          .from("pomos")
          .insert([
            {
              room_id: roomId,
              duration: defaultDuration,
              status: "idle",
              mode: "pomodoro",
              remaining_time: defaultDuration,
              end_time: null,
            },
          ])
          .select()
          .single();

        if (createError || !newPomo) {
          console.error("Error creating default pomos:", createError);
          socket.emit("error", { message: "Failed to create timer" });
          return;
        }

        room.pomodoroState = {
          id: newPomo.id,
          duration: newPomo.duration,
          status: newPomo.status,
          mode: newPomo.mode,
          endTime: newPomo.end_time,
          remainingTime: newPomo.remaining_time,
        };
      }

      // Calculate endTime: current time + remainingTime (or duration if no remaining)
      const timeToAdd =
        room.pomodoroState.remainingTime ||
        room.pomodoroState.duration ||
        25 * 60 * 1000;
      const now = Date.now();
      const endTime = now + timeToAdd;

      // Update memory
      room.pomodoroState.status = "running";
      room.pomodoroState.endTime = endTime;

      // Broadcast timer-updated to room
      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      // Async DB update (fire and forget)
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

      // Host Bouncer Check
      if (session.userId !== room.hostId) {
        socket.emit("error", { message: "Only host can control timer" });
        return;
      }

      // Initialize pomodoroState if it doesn't exist
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const defaultDuration = 25 * 60 * 1000;

        const { data: newPomo, error: createError } = await client
          .from("pomos")
          .insert([
            {
              room_id: roomId,
              duration: defaultDuration,
              status: "idle",
              mode: "pomodoro",
              remaining_time: defaultDuration,
              end_time: null,
            },
          ])
          .select()
          .single();

        if (createError || !newPomo) {
          console.error("Error creating default pomos:", createError);
          socket.emit("error", { message: "Failed to create timer" });
          return;
        }

        room.pomodoroState = {
          id: newPomo.id,
          duration: newPomo.duration,
          status: newPomo.status,
          mode: newPomo.mode,
          endTime: newPomo.end_time,
          remainingTime: newPomo.remaining_time,
        };
      }

      // Calculate remainingTime from endTime
      let remainingTime = room.pomodoroState.remainingTime || 0;
      if (
        room.pomodoroState.endTime &&
        room.pomodoroState.status === "running"
      ) {
        const now = Date.now();
        remainingTime = Math.max(0, room.pomodoroState.endTime - now);
      }

      // Update memory
      room.pomodoroState.status = "paused";
      room.pomodoroState.remainingTime = remainingTime;
      room.pomodoroState.endTime = null;

      // Broadcast timer-updated to room
      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      // Async DB update
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

      // Host Bouncer Check
      if (session.userId !== room.hostId) {
        socket.emit("error", { message: "Only host can control timer" });
        return;
      }

      // Validate mode
      const validModes = ["pomodoro", "short_break", "long_break"];
      if (!validModes.includes(mode)) {
        socket.emit("error", { message: "Invalid mode" });
        return;
      }

      // Update custom durations if provided
      if (durations) {
        room.customDurations = {
          pomo: durations.pomo || room.customDurations.pomo,
          short: durations.short || room.customDurations.short,
          long: durations.long || room.customDurations.long,
        };
      }

      // Initialize pomodoroState if it doesn't exist
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const modeSettingsMinutes = {
          pomodoro: room.customDurations.pomo,
          short_break: room.customDurations.short,
          long_break: room.customDurations.long,
        };
        const defaultDurationMs =
          (modeSettingsMinutes[mode as keyof typeof modeSettingsMinutes] ||
            25) *
          60 *
          1000;

        const { data: newPomo, error: createError } = await client
          .from("pomos")
          .insert([
            {
              room_id: roomId,
              duration: defaultDurationMs,
              status: "idle",
              mode,
              remaining_time: defaultDurationMs,
              end_time: null,
            },
          ])
          .select()
          .single();

        if (createError || !newPomo) {
          console.error("Error creating default pomos:", createError);
          socket.emit("error", { message: "Failed to create timer" });
          return;
        }

        room.pomodoroState = {
          id: newPomo.id,
          duration: newPomo.duration,
          status: newPomo.status,
          mode: newPomo.mode,
          endTime: newPomo.end_time,
          remainingTime: newPomo.remaining_time,
        };
      }

      // Calculate duration based on mode using custom durations
      const modeToCustomKey: { [key: string]: "pomo" | "short" | "long" } = {
        pomodoro: "pomo",
        short_break: "short",
        long_break: "long",
      };
      const customKey = modeToCustomKey[mode] as "pomo" | "short" | "long";
      const durationMinutes = room.customDurations[customKey];
      const duration = durationMinutes * 60 * 1000;

      // Update memory
      room.pomodoroState.mode = mode;
      room.pomodoroState.status = "idle";
      room.pomodoroState.remainingTime = duration;
      room.pomodoroState.duration = duration;
      room.pomodoroState.endTime = null;

      // Broadcast timer-updated to room
      io.to(roomId).emit("timer-updated", {
        ...room.pomodoroState,
      });

      // Async DB update (fire and forget)
      const client = createSupabaseClient(session.token);
      void client
        .from("pomos")
        .update({
          mode,
          status: "idle",
          remaining_time: duration,
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

        // Validate user is a member of this room
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

        // Build update object with only provided fields
        const updateData: any = {};
        if (roomTitle !== undefined) updateData.room_title = roomTitle;
        if (description !== undefined) updateData.description = description;
        if (location !== undefined) updateData.location = location;

        // Ensure at least one field is provided
        if (Object.keys(updateData).length === 0) {
          socket.emit("error", {
            message: "Please provide at least one field to update",
          });
          return;
        }

        // Update database
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

        // Broadcast updated room data to all users in the room
        io.to(roomId).emit("room-updated", updatedRoom);
      },
    );

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