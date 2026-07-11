import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Eye, MousePointer } from "lucide-react";
import { format } from "date-fns";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  preview_text?: string | null;
  sender_name: string;
  sender_email: string;
  list_id?: string | null;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
};

type Log = {
  id: string;
  recipient_name: string | null;
  recipient_email: string;
  status: string;
  error_message?: string | null;
  sent_at?: string | null;
  bounced_at?: string | null;
  created_at: string;
};

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;

      setLoading(true);

      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      const { data: logData, error: logError } = await supabase
  .from("campaign_email_logs")
  .select("*")
  .eq("campaign_id", id)
  .order("sent_at", { ascending: false });

   console.log("Campaign id:", id);
   console.log("Logs:", logData);
   console.log("Log error:", logError);
      setCampaign(campaignData);
      setLogs(logData || []);
      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  if (loading) return <div className="p-6">Loading campaign details...</div>;
  if (!campaign) return <div className="p-6">Campaign not found.</div>;

  const failed = logs.filter(l => l.status === "failed").length;
  const sent = logs.filter(l => l.status === "sent").length;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/campaigns")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{campaign.subject}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <Mail className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Total Sent</p>
          <p className="text-2xl font-bold">{campaign.sent_count || sent}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Delivered Logs</p>
          <p className="text-2xl font-bold">{sent}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <Eye className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Opens</p>
          <p className="text-2xl font-bold">{campaign.open_count || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <MousePointer className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Clicks</p>
          <p className="text-2xl font-bold">{campaign.click_count || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Failed/Bounced</p>
          <p className="text-2xl font-bold">{campaign.bounce_count || failed}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Campaign Information</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <p><b>Sender Name:</b> {campaign.sender_name}</p>
          <p><b>Sender Email:</b> {campaign.sender_email}</p>
          <p><b>Status:</b> {campaign.status}</p>
          <p><b>Created:</b> {format(new Date(campaign.created_at), "MMM d, yyyy h:mm a")}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Recipient Delivery Logs</h2>
          <p className="text-sm text-muted-foreground">{logs.length} recipient records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Sent Time</th>
                <th className="text-left p-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No recipient logs found.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="p-3">{log.recipient_name || "-"}</td>
                    <td className="p-3">{log.recipient_email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === "sent"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {log.sent_at ? format(new Date(log.sent_at), "MMM d, yyyy h:mm a") : "-"}
                    </td>
                    <td className="p-3 text-red-600">{log.error_message || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}