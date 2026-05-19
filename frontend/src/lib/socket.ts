import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    const socketUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

    socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
    });
  }
  return socket;
};

export const initSocket = (token: string, roomId: string): Socket => {
  const s = getSocket(token);

  s.on("connect", () => {
    s.emit("join-room", { roomId, token });
  });

  return s;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};