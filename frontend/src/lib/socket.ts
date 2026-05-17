import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const initSocket = (token: string, roomId: string): Socket => {
  const s = getSocket(token);

  // Re-join room on every (re)connect
  s.on("connect", () => {
    s.emit("join_room", roomId);
  });

  return s;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const isSocketConnected = (): boolean => {
  return socket ? socket.connected : false;
};