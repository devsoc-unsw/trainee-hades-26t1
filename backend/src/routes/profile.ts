import { Router, type Request, type Response } from "express";
import { supabaseAuth } from "../middleware/supabaseAuth.js";

const router: Router = Router();

// GET /api/profile - Get user profile
router.get("/", supabaseAuth, async (req: Request, res: Response) => {
  try {    
    // Get user ID from authenticated request
    const supabaseClient = req.supabaseClient;
    if (!supabaseClient) {
      return res.status(500).json({ error: "Supabase client not initialized" });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log("Authenticated user ID:", userId);
    
    const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, name, rooms, currency, avatar_url")
    .eq("id", userId)
    .single();

    const email = req.authUser?.email;
    
    console.log("Profile data:", data);
    console.log("Email:", email);

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
    
    const { name, avatar_url } = req.body;
    
    // Ensure at least 1 field is provided to update
    if (!name && !avatar_url) {
      return res.status(400).json({ error: "Please provide a name or avatar_url to update" });
    } 
    
    // Build an update object dynamically (only include fields that exist)
    const updateData: { name?: string; avatar_url?: string } = {};
    if (name) updateData.name = name;
    if (avatar_url) updateData.avatar_url = avatar_url;

    const { data, error } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select("id, email, name, currency, avatar_url, created_at") 
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

export default router;