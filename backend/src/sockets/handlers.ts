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


export const todoHandler = (io: Server) => {
  // todo-related events
};

export const roomHandler = (io: Server) => {
  // join-room
};

