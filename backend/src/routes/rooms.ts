import { Router, type Request, type Response } from "express";
import { supabaseAuth } from "../middleware/supabaseAuth.js";

const router: Router = Router();

// POST /api/rooms/room - Create a new room
router.post("/room", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { roomTitle } = req.body;
    const supabaseClient = req.supabaseClient;

    // Validate required fields
    if (!roomTitle) {
      return res.status(400).json({
        error: "Missing required field: roomTitle"
      });
    }

    if (!req.authUser || !supabaseClient) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header. Use: Bearer <access_token>."
      });
    }

    // Create room entry
    const roomData = {
      room_title: roomTitle,
      created_by: req.authUser.id,
      created_at: new Date().toISOString()
    };

    const { data: roomResult, error: roomError } = await supabaseClient
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
router.get("/", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const supabaseClient = req.supabaseClient;

    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const { data, error } = await supabaseClient
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
router.get("/:roomId", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const supabaseClient = req.supabaseClient;

    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const { data, error } = await supabaseClient
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
