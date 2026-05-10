import { Router, type Request, type Response } from "express";
import { createSupabaseClient, supabase } from "../config/supabase.js";

const router: Router = Router();

// POST /api/rooms/room - Create a new room
router.post("/room", async (req: Request, res: Response) => {
  try {
    const { roomTitle } = req.body;
    const authHeader = req.header("authorization");
    
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!accessToken) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header. Use: Bearer <access_token>."
      });
    }

    const userSupabase = createSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    // Validate required fields
    if (!roomTitle) {
      return res.status(400).json({
        error: "Missing required field: roomTitle"
      });
    }

    // Create room entry
    const roomData = {
      room_title: roomTitle,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const { data: roomResult, error: roomError } = await userSupabase
      .from("rooms")
      .insert([roomData])
      .select();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return res.status(500).json({ error: `Failed to create room: ${roomError.message}` });
    }

    res.status(201).json({
      message: "Room created successfully",
      data: {
        room: roomResult[0]
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/rooms - Get all rooms
router.get("/", async (req: Request, res: Response) => {
  try {
    const authHeader = req.header("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    // Use authenticated client if token provided, otherwise use unauthenticated
    const querySupabase = accessToken ? createSupabaseClient(accessToken) : supabase;

    const { data, error } = await querySupabase
      .from("rooms")
      .select("id, roomTitle:room_title, createdBy:created_by, createdAt:created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/rooms/:roomId - Get a specific room
router.get("/:roomId", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const authHeader = req.header("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    // Use authenticated client if token provided, otherwise use unauthenticated
    const querySupabase = accessToken ? createSupabaseClient(accessToken) : supabase;

    const { data, error } = await querySupabase
      .from("rooms")
      .select("id, roomTitle:room_title, createdBy:created_by, createdAt:created_at")
      .eq("room_id", roomId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
