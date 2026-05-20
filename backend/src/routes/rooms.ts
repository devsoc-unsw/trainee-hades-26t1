import { Router, type Request, type Response } from "express";
import { supabaseAuth } from "../middleware/supabaseAuth.js";
import bcrypt from "bcryptjs";

const router: Router = Router();

// POST /api/rooms/room - Create a new room
router.post("/room", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { roomTitle, description, location, password } = req.body;
    const supabaseClient = req.supabaseClient;

    if (!roomTitle) {
      return res
        .status(400)
        .json({ error: "Missing required field: roomTitle" });
    }

    let password_hash: string | null = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    if (!req.authUser || !supabaseClient) {
      return res.status(401).json({
        error:
          "Missing or invalid Authorization header. Use: Bearer <access_token>.",
      });
    }

    const roomData = {
      room_title: roomTitle,
      description: description || "",
      location: location || "Online",
      created_by: req.authUser.id,
      created_at: new Date().toISOString(),
      password_hash,
    };

    const { data: roomResult, error: roomError } = await supabaseClient
      .from("rooms")
      .insert([roomData])
      .select();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return res
        .status(500)
        .json({ error: `Failed to create room: ${roomError.message}` });
    }

    res.status(201).json({
      message: "Room created successfully",
      data: { room: roomResult[0] },
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
      .select(
        "id, roomTitle:room_title, description, location, createdBy:created_by, createdAt:created_at, backgroundId:background_id",
      )
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

// GET /api/rooms/:roomId/messages - Get chat history for a specific room
router.get(
  "/:roomId/messages",
  supabaseAuth,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const supabaseClient = req.supabaseClient;

      if (!supabaseClient) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }

      const { data, error } = await supabaseClient
        .from("messages")
        .select("userId:user_id, message, timestamp:created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      const messages = data ?? [];
      const uniqueUserIds = [...new Set(messages.map((m) => m.userId))];

      let nameById = new Map<string, string>();
      if (uniqueUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("id, name")
          .in("id", uniqueUserIds);

        if (profilesError) {
          console.error("Supabase profiles error:", profilesError);
        } else if (profiles) {
          nameById = new Map(
            profiles.map((p) => [p.id as string, p.name as string]),
          );
        }
      }

      const enriched = messages.map((m) => ({
        ...m,
        name: nameById.get(m.userId) ?? "Unknown",
      }));

      res.json(enriched);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /api/rooms/:roomId/todos - Get todos for a specific room
router.get(
  "/:roomId/todos",
  supabaseAuth,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const supabaseClient = req.supabaseClient;

      if (!supabaseClient) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }

    const { data, error } = await supabaseClient
      .from("todos")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

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
      .select(
        "id, roomTitle:room_title, description, location, createdBy:created_by, createdAt:created_at, backgroundId:background_id",
      )
      .eq("id", roomId)
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

// PUT /api/rooms/:roomId - Update a specific room
router.put("/:roomId", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { roomTitle, description, location, backgroundId } = req.body;
    const supabaseClient = req.supabaseClient;
    const authUser = req.authUser;

    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updateData: any = {};
    if (roomTitle !== undefined) updateData.room_title = roomTitle;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (backgroundId !== undefined) updateData.background_id = backgroundId;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "Please provide at least one field to update",
      });
    }

    // Check if user is a member of the room
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("room")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profileData) {
      return res.status(403).json({ error: "Profile not found" });
    }

    if (profileData.room !== roomId) {
      return res
        .status(403)
        .json({ error: "You are not a member of this room" });
    }

    const { data, error } = await supabaseClient
      .from("rooms")
      .update(updateData)
      .eq("id", roomId)
      .select(
        "id, roomTitle:room_title, description, location, createdBy:created_by, createdAt:created_at, backgroundId:background_id",
      )
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to update room" });
    }

    console.log("Room updated successfully:", data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/:roomId/users",
  supabaseAuth,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const supabaseClient = req.supabaseClient;

      if (!supabaseClient) {
        return res
          .status(500)
          .json({ error: "Supabase client not initialized" });
      }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, name, character_id")
      .eq("room", roomId);

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

    // Map to RoomUser type
    const users = data.map((u: any) => ({
      userId: u.id,
      name: u.name,
      characterId: u.character_id,
    }));

      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
