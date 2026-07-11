const express = require("express");
const router = express.Router();
const { sendCampaign } = require("../services/campaign.service");

// SEND CAMPAIGN
router.post("/send", async (req, res) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "campaignId required",
      });
    }

    const result = await sendCampaign(campaignId);

    return res.json({
      success: true,
      message: "Campaign sent",
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;