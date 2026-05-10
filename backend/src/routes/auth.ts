import { Router, type Request, type Response } from "express";
import { createSupabaseClient } from "../config/supabase.js";

const router: Router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Sign In
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
