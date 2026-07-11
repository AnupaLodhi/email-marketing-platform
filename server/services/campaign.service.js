const supabase = require("../supabase");
const { sendEmail } = require("./email.service");

const sendCampaign = async (campaignId) => {
  // 1. Mark campaign as sending
  await supabase
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  // 2. Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error("Campaign not found");
  }

  // 3. Get subscribers from the selected list
  const { data: subscribers, error: subscribersError } = await supabase
    .from("subscribers")
    .select("*")
    .eq("list_id", campaign.list_id);
    console.log("Campaign list_id:", campaign.list_id);
    console.log("Subscribers:", subscribers.map(s => s.email));

  if (subscribersError) {
    throw subscribersError;
  }

  if (!subscribers || subscribers.length === 0) {
    throw new Error("No subscribers found for this campaign.");
  }

  let sent = 0;

  // 4. Send email to every subscriber
  for (const subscriber of subscribers) {
    try {
      console.log(`Sending to ${subscriber.email}`);

      await sendEmail({
        to: subscriber.email,
        subject: campaign.subject || "New Campaign",
        html: campaign.template_html || "<p>Hello!</p>",
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send to ${subscriber.email}`, err);
    }
  }

  // 5. Update campaign status
  await supabase
    .from("campaigns")
    .update({
      status: "completed",
      sent_count: sent,
    })
    .eq("id", campaignId);

  return {
    success: true,
    campaignId,
    sent,
    total: subscribers.length,
  };
};

module.exports = {
  sendCampaign,
};