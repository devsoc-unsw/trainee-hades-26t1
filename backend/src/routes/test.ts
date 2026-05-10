import { Router, type Request, type Response } from "express";
import { supabase } from "../config/supabase.js";

const router: Router = Router();

// Health check & Supabase test
router.get("/health", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: "Supabase connected successfully",
      data
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
