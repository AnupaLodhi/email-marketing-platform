const express = require("express");
const router = express.Router();
const supabase = require("./supabase");
const validator = require("validator");
const rateLimit = require("express-rate-limit");
const { sendWelcomeEmail } = require("./services/email.service");

// RATE LIMIT
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});

// TEST ROUTE
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Subscriber route working 🚀",
  });
});

// SUBSCRIBE ROUTE
router.post("/subscribe", limiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const { data: existing } = await supabase
      .from("subscribers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already subscribed",
      });
    }

    const { data, error } = await supabase
      .from("subscribers")
      .insert([
        {
          email,
          name: email.split("@")[0],
          status: "active",
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // SEND EMAIL (safe call)
    try {
      await sendWelcomeEmail(email, email.split("@")[0]);
    } catch (emailErr) {
      console.log("Email failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Subscribed successfully 🚀",
      data,
    });

  } catch (err) {
    console.log("SERVER ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET ALL SUBSCRIBERS
router.get("/all", async (req, res) => {
  const { data, error } = await supabase
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  res.json({
    success: true,
    count: data.length,
    data,
  });
});

module.exports = router;