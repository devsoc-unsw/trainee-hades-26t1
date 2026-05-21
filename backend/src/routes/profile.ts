import { Router, type Request, type Response } from "express";
import { supabaseAuth } from "../middleware/supabaseAuth.js";
import bcrypt from "bcryptjs";

const router: Router = Router();

// GET /api/profile - Get user profile
router.get("/", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const supabaseClient = req.supabaseClient;
    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, name, room, currency, avatar_url, character_id")
      .eq("id", userId)
      .single();

    const email = req.authUser?.email;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ...data, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/profile - Update user profile (and handle secure room joining)
router.put("/", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { room, password, character_id } = req.body;
    const authUser = req.authUser;
    const supabaseClient = req.supabaseClient;

    if (!supabaseClient || !authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // --- SECURE ROOM JOIN LOGIC ---
    if (room !== undefined && room !== null) {
      const { data: roomData, error: roomError } = await supabaseClient
        .from("rooms")
        .select("created_by, password_hash")
        .eq("id", room)
        .single();

      if (roomError || !roomData) {
        return res.status(404).json({ error: "Room not found" });
      }

      const isOwner = roomData.created_by === authUser.id;
      const isPrivate = roomData.password_hash !== null;

      // If it's private and they aren't the owner, verify the password NOW
      if (isPrivate && !isOwner) {
        if (!password) {
          return res.status(401).json({ error: "Password required to join this private room." });
        }
        const isValid = await bcrypt.compare(password, roomData.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: "Incorrect password." });
        }
      }
    }

    // --- UPDATE PROFILE ---
    const updateData: any = {};
    if (room !== undefined) updateData.room = room;
    if (character_id !== undefined) updateData.character_id = character_id;

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("id", authUser.id);

    if (updateError) {
      console.error("Supabase profile update error:", updateError);
      return res.status(500).json({ error: "Failed to update profile" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:userId - Get another user's profile by ID
router.get("/:userId", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const supabaseClient = req.supabaseClient;

    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, name, room, currency, avatar_url, character_id")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(404).json({ error: "User not found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;