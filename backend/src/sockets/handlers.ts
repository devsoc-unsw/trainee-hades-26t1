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
  hostId: string | null;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
}

const roomStates = new Map<string, RoomState>();
const socketUsers = new Map<string, { userId: string; roomId: string; token: string }>();

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
  hostId: string | null;
  pomodoroState: PomodoroState | null;
  todoState: TodoState | null;
}> {
  const client = createSupabaseClient(token);

  const [pomosResult, todosResult, roomResult] = await Promise.all([
    client
      .from("pomos")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("todos").select("*").eq("room_id", roomId).maybeSingle(),
    client.from("rooms").select("created_by").eq("id", roomId).single(),
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

  return { hostId, pomodoroState, todoState };
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
        const { hostId, pomodoroState, todoState } = await fetchRoomStateFromSupabase(
          roomId,
          token,
        );
        room = { users: new Set(), hostId, pomodoroState, todoState };
        roomStates.set(roomId, room);
      }

      room.users.add(userId);
      socketUsers.set(socket.id, { userId, roomId, token });

      socket.emit("room-state", {
        users: Array.from(room.users),
        hostId: room.hostId,
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
        (room.pomodoroState.remainingTime || room.pomodoroState.duration || 25 * 60 * 1000);
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
          console.log(`Updated pomo ${room.pomodoroState?.id} status to running`);
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
      if (room.pomodoroState.endTime && room.pomodoroState.status === "running") {
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
          console.log(`Updated pomo ${room.pomodoroState?.id} status to paused`);
        });
    });

    // Change pomo mode handler
    socket.on("change-pomo-mode", async ({ roomId, mode }) => {
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

      // Initialize pomodoroState if it doesn't exist
      if (!room.pomodoroState) {
        const client = createSupabaseClient(session.token);
        const modeSettings = {
          pomodoro: 25 * 60 * 1000,
          short_break: 5 * 60 * 1000,
          long_break: 15 * 60 * 1000,
        };
        const defaultDuration = modeSettings[mode as keyof typeof modeSettings] || 25 * 60 * 1000;
        
        const { data: newPomo, error: createError } = await client
          .from("pomos")
          .insert([
            {
              room_id: roomId,
              duration: defaultDuration,
              status: "idle",
              mode,
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

      // Calculate duration based on mode
      const durations: { [key: string]: number } = {
        pomodoro: 25 * 60 * 1000,
        short_break: 5 * 60 * 1000,
        long_break: 15 * 60 * 1000,
      };
      const duration = durations[mode] || 25 * 60 * 1000;

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

