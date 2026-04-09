import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js"

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

const supabase = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// test router
// app.get("/", (req, res) => {
//   res.send("Hello World!");
//   console.log("Response sent");
// });

// supabase test
app.get("/test", async (req, res) => {
  const { data, error } = await supabase().from("users").select("*").limit(1)

  if (error) {
    console.log(error)
    return res.status(500).json({error: error.message})
  }

  res.json({
    message: "Supabase connected successfully",
    data
  })
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});