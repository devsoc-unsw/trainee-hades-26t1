import { Server, Socket } from "socket.io";

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
