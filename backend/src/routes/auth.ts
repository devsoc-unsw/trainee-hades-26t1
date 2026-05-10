import { Router, type Request, type Response } from "express";
import { supabase } from "../config/supabase.js";

const router: Router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body; 

    if (!email || !password || !name) { 
      return res.status(400).json({ error: "Email, password and name are required" });
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user!.id,
        name,
        rooms: [],
        currency: 0
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.json(data); 

  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Sign In
router.post("/signin", async (req: Request, res: Response) => {
  try {
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
