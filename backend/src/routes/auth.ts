import { Router, type Request, type Response } from "express";
import { createSupabaseClient } from "../config/supabase.js";

const router: Router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { email, password, name } = req.body; 

    if (!email || !password || !name) { 
      return res.status(400).json({ error: "Email, password and name are required" });
    }

    const { data, error } = await supabase.auth.signUp(
      { email, password, options: { data: { name: name } }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data); 

  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
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
