const cors = require("cors");
require("dotenv").config();

const express = require("express");
const app = express();
(async () => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .limit(1);

  console.log("SUPABASE TEST:");
  console.log("data:", data);
  console.log("error:", error);
})();
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

console.log("🔥 SERVER BOOTING...");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

app.use(express.json());

// routes
app.use("/api/campaigns", require("./routes/campaign.routes"));

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});