import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase.js";

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    // Message handler example
    // socket.on("message", (data) => {
    //   console.log(`Message from ${socket.id}:`, data);
    //   io.emit("message", { id: socket.id, ...data });
    // });
  });
};

export const createRoomHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("joinRoom", (roomName) => {
      socket.join(roomName);
      console.log(`User ${socket.id} joined room: ${roomName}`);
      io.to(roomName).emit("message", `User ${socket.id} has joined the room.`);
    });
    
    socket.on("leaveRoom", (roomName) => {
      socket.leave(roomName);
      console.log(`User ${socket.id} left room: ${roomName}`);
      io.to(roomName).emit("message", `User ${socket.id} has left the room.`);
    });
  });
};

export const todoHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("addTodo", (todo) => {
      console.log(`User ${socket.id} added todo:`, todo);
      io.emit("addTodo", { id: socket.id, ...todo });
    });

  socket.on("updateTodo", (todo) => {
    console.log(`User ${socket.id} updated todo:`, todo);
    io.emit("updateTodo", { id: socket.id, ...todo });
  });

    socket.on("deleteTodo", (todoId) => {
      console.log(`User ${socket.id} deleted todo with id:`, todoId);
      io.emit("deleteTodo", { id: socket.id, todoId });
    });
  });
};

export const roomHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    // Real-time room creation via Socket.io
    socket.on("createRoom", async (roomData) => {
      try {
        const { roomTitle, roomId, todoId, pomoId } = roomData;

        // Validate required fields
        if (!roomTitle || !roomId || !todoId || !pomoId) {
          socket.emit("roomError", {
            error: "Missing required fields: roomTitle, roomId, todoId, pomoId"
          });
          return;
        }

        // 1. Create todo entry
        const todoPayload = {
          todo_id: todoId,
          room_id: roomId,
          items: [],
          created_at: new Date().toISOString()
        };

        const { data: todoResult, error: todoError } = await supabase
          .from("todos")
          .insert([todoPayload])
          .select();

        if (todoError) {
          console.error("Error creating todo:", todoError);
          socket.emit("roomError", { error: `Failed to create todo: ${todoError.message}` });
          return;
        }

        // 2. Create pomo entry
        const pomoPayload = {
          pomo_id: pomoId,
          room_id: roomId,
          duration: 1500, // 25 minutes in seconds
          status: "idle",
          created_at: new Date().toISOString()
        };

        const { data: pomoResult, error: pomoError } = await supabase
          .from("pomos")
          .insert([pomoPayload])
          .select();

        if (pomoError) {
          console.error("Error creating pomo:", pomoError);
          // Rollback todo
          await supabase.from("todos").delete().eq("todo_id", todoId);
          socket.emit("roomError", { error: `Failed to create pomo: ${pomoError.message}` });
          return;
        }

        // 3. Create room entry
        const roomPayload = {
          room_title: roomTitle,
          room_id: roomId,
          todo_id: todoId,
          pomo_id: pomoId,
          created_at: new Date().toISOString()
        };

        const { data: roomResult, error: roomError } = await supabase
          .from("rooms")
          .insert([roomPayload])
          .select();

        if (roomError) {
          console.error("Error creating room:", roomError);
          // Rollback todo and pomo
          await supabase.from("todos").delete().eq("todo_id", todoId);
          await supabase.from("pomos").delete().eq("pomo_id", pomoId);
          socket.emit("roomError", { error: `Failed to create room: ${roomError.message}` });
          return;
        }

        // Broadcast to all connected clients
        io.emit("roomCreated", {
          message: `Room ${roomTitle} created by user ${socket.id}`,
          data: {
            room: roomResult[0],
            todo: todoResult[0],
            pomo: pomoResult[0]
          }
        });

        console.log(`User ${socket.id} created room: ${roomTitle} with todo and pomo`);
      } catch (err) {
        console.error(err);
        socket.emit("roomError", { error: "Internal server error" });
      }
    });

    // Listen for room join events
    socket.on("joinRoomSpace", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room space: ${roomId}`);
      io.to(roomId).emit("userJoined", {
        message: `User ${socket.id} joined the room`,
        userId: socket.id
      });
    });

    // Listen for room leave events
    socket.on("leaveRoomSpace", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room space: ${roomId}`);
      io.to(roomId).emit("userLeft", {
        message: `User ${socket.id} left the room`,
        userId: socket.id
      });
    });
  });
};