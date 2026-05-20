import { Router, type Request, type Response } from "express";
import { supabaseAuth } from "../middleware/supabaseAuth.js";

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

// PUT /api/profile - Update user profile
router.put("/", supabaseAuth, async (req: Request, res: Response) => {
  try {
    const supabaseClient = req.supabaseClient;
    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, avatar_url, room, character_id } = req.body;

    if (!name && !avatar_url && room === undefined && !character_id) {
      return res.status(400).json({ error: "Please provide at least one field to update" });
    }

    const updateData: {
      name?: string;
      avatar_url?: string;
      room?: number | null;
      character_id?: string;
    } = {};

    if (name) updateData.name = name;
    if (avatar_url) updateData.avatar_url = avatar_url;
    if (room !== undefined) updateData.room = room;
    if (character_id) updateData.character_id = character_id;

    const { data, error } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select("id, name, currency, avatar_url, room, character_id")
      .single();

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