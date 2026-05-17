import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import testRoutes from "./routes/test.js";
import roomsRoutes from "./routes/rooms.js";
import profileRoutes from "./routes/profile.js";
import { setupSocketHandlers } from "./sockets/handlers.js";

// Load environment variables
dotenv.config();

// Environment variables
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Initialize Express app
const app = express();
app.use(cors());

const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/profile", profileRoutes);

// Socket.IO handlers
setupSocketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
});
