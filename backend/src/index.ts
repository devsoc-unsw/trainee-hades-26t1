import express from "express";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// will set up supabase later

// test router
app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log("Response sent");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});