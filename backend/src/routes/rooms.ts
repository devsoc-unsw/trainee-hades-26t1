import { Router, type Request, type Response } from "express";
import { supabase } from "../config/supabase.js";

const router: Router = Router();

interface CreateRoomRequest {
  roomTitle: string;
}

interface TodoItem {
  content: string;
  isDone: boolean;
  createdAt: string;
}

// POST /room - Create a new room
router.post("/room", async (req: Request<{}, {}, CreateRoomRequest>, res: Response) => {
  try {
    const { roomTitle } = req.body;

    // Validate required fields
    if (!roomTitle) {
      return res.status(400).json({
        error: "Missing required field: roomTitle"
      });
    }

    // Create room entry
    const roomData = {
      room_title: roomTitle,
      created_by: "f9aef7ac-e022-4c56-b457-1491d730e0e3", // Placeholder, replace with actual user ID if authentication is implemented
      created_at: new Date().toISOString()
    };

    const { data: roomResult, error: roomError } = await supabase
      .from("rooms")
      .insert([roomData])
      .select();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return res.status(500).json({ error: `Failed to create room: ${roomError.message}` });
    }

    // Create todo entry
    const todoData = {
      items: [] as TodoItem[],
      created_at: new Date().toISOString(),
      room_id: roomResult[0].room_id
    };

    const { data: todoResult, error: todoError } = await supabase
      .from("todos")
      .insert([todoData])
      .select();

    if (todoError) {
      console.error("Error creating todo:", todoError);
      // Rollback room if todo fails
      await supabase.from("rooms").delete().eq("room_id", roomResult[0].room_id);
      return res.status(500).json({ error: `Failed to create todo: ${todoError.message}` });
    }

    // Create pomo entry
    const pomoData = {
      room_id: roomResult[0].room_id,
      duration: 1500, // 25 minutes in seconds (standard Pomodoro)
      status: "idle", // idle, running, paused, completed
      created_at: new Date().toISOString()
    };

    const { data: pomoResult, error: pomoError } = await supabase
      .from("pomos")
      .insert([pomoData])
      .select();

    if (pomoError) {
      console.error("Error creating pomo:", pomoError);
      // Rollback todo if pomo fails
      await supabase.from("todos").delete().eq("todo_id", todoResult[0].todo_id);
      // Rollback room if pomo fails
      await supabase.from("rooms").delete().eq("room_id", roomResult[0].room_id);
      return res.status(500).json({ error: `Failed to create pomo: ${pomoError.message}` });
    }

    res.status(201).json({
      message: "Room created successfully with todo and pomo",
      data: {
        room: roomResult[0],
        todo: todoResult[0],
        pomo: pomoResult[0]
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /rooms - Get all rooms
router.get("/rooms", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
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

// GET /rooms/:roomId - Get a specific room
router.get("/rooms/:roomId", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
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
