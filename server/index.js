require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Routes
const subscriberRoutes = require("./subscriber.routes");

// Middleware
app.use(cors());
app.use(express.json());

// Route usage
app.use("/api/subscribers", subscriberRoutes);

// Test root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running 🚀",
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});