import express, { Request, Response } from "express";
import dotenv from "dotenv";
import supabase from "./supabaseClient";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- ROUTES ---

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "Server is running normally." });
});

app.get("/api/data", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*");

    if (error) throw error;

    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
