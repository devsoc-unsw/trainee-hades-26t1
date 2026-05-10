import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js"

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

const supabase = createClient(
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
  const { data, error } = await supabase.from("users").select("*").limit(1)

  if (error) {
    console.log(error)
    return res.status(500).json({error: error.message})
  }

  res.json({
    message: "Supabase connected successfully",
    data
  })
});

// gets the user
// const { data: { users } } = await supabase().auth.getUser()

// logout handler (temporary)
// await supabase().auth.signOut()

// register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// signin
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // include an error check for non-existant credentials

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});