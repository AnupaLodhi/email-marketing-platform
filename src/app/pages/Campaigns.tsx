import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Edit2, Trash2, Send, X, Check, Mail, Clock,
  FileText, AlertCircle, CheckCircle, Loader, Eye,
} from "lucide-react";

type CampaignStatus = Campaign["status"];

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: FileText },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: Clock },
  sending: { label: "Sending", color: "bg-yellow-100 text-yellow-700", icon: Loader },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

interface FormState {
  name: string;
  subject: string;
  preview_text: string;
  sender_name: string;
  sender_email: string;
  sending_domain_id: string;
  sender_email_id: string;
  list_id: string;
  template_html: string;
  status: CampaignStatus;
  scheduled_at: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  subject: "",
  preview_text: "",
  sender_name: "",
  sender_email: "",
  sending_domain_id: "",
  sender_email_id: "",
  list_id: "",
  template_html: "",
  status: "draft",
  scheduled_at: "",
};

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{{subject}}</title></head>
<body style="font-family: Arial, sans-serif; background:#f6f7fb; margin:0; padding:30px; color:#222;">
  <div style="max-width:620px; margin:auto; background:#ffffff; border-radius:12px; padding:30px; border:1px solid #e5e7eb;">
    <h2 style="margin-top:0; color:#111827;">{{subject}}</h2>
    <p style="color:#6b7280;">{{preview_text}}</p>

    <p>Hello {{name}},</p>

    <p>
      Thank you for your interest. We are sharing this update regarding your recent request.
    </p>

    <p>
      Please review the details carefully and contact us if you need any assistance.
    </p>

    <p style="margin-top:30px;">
      Regards,<br>
      <strong>{{sender_name}}</strong>
    </p>

    <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;">

    <p style="font-size:12px; color:#6b7280;">
      You are receiving this email because you subscribed to our list.
    </p>
  </div>
</body>
</html>`;
type Campaign = {
  id: string;
  name: string;
  subject: string;
  preview_text?: string | null;
  sender_name: string;
  sender_email: string;
  sending_domain_id?: string | null;
  sender_email_id?: string | null;
  list_id?: string | null;
  template_html?: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at?: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
};

type List = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
};
type SendingDomain = {
  id: string;
  domain: string;
  status: string;
};

type SenderEmail = {
  id: string;
  domain_id: string;
  email: string;
  sender_name?: string | null;
  is_verified: boolean;
};
type CampaignEmailLog = {
  id: string;
  campaign_id: string;
  recipient_name: string | null;
  recipient_email: string;
  status: "sent" | "failed" | string;
  error_message?: string | null;
  sent_at?: string | null;
  bounced_at?: string | null;
  created_at: string;
};
export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sendingDomains, setSendingDomains] = useState<SendingDomain[]>([]);
  const [senderEmails, setSenderEmails] = useState<SenderEmail[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCampaignId, setTestCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<CampaignEmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const openCampaignDetails = async (campaign: Campaign) => {
  setSelectedCampaign(campaign);
  setCampaignLogs([]);
  setLoadingLogs(true);

  const { data, error } = await supabase
  .from("campaign_email_logs")
  .select("*")
  .eq("campaign_id", campaign.id)
  .order("sent_at", { ascending: false });

  if (error) {
    toast.error(error.message);
  } else {
    setCampaignLogs(data || []);
  }

  setLoadingLogs(false);
};
  const fetchData = useCallback(async () => {
  try {
    setLoading(true);

    const { data: camps, error: campError } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: listsData, error: listError } = await supabase
      .from("lists")
      .select("*")
      .order("name");
    const { data: domainData, error: domainError } = await supabase
  .from("sending_domains")
  .select("*")
  .eq("status", "verified")
  .order("domain");

const { data: senderData, error: senderError } = await supabase
  .from("sender_emails")
  .select("*")
  .eq("is_verified", true)
  .order("email");

console.log("Domain data:", domainData);
console.log("Domain error:", domainError);
console.log("Sender data:", senderData);
console.log("Sender error:", senderError);

if (domainError) throw domainError;
if (senderError) throw senderError;

setSendingDomains(domainData || []);
setSenderEmails(senderData || []);

if (campError) throw campError;
if (listError) throw listError;

setCampaigns(camps || []);
setLists(listsData || []);
  } catch (err: any) {
    console.error(err);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, template_html: DEFAULT_TEMPLATE });
    setShowForm(true);
    setPreviewHtml(false);
  };

  const openEdit = (c: Campaign) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      subject: c.subject,
      preview_text: c.preview_text || "",
      sender_name: c.sender_name,
      sender_email: c.sender_email,
      sending_domain_id: (c as any).sending_domain_id || "",
      sender_email_id: (c as any).sender_email_id || "",
      list_id: c.list_id || "",
      template_html: c.template_html || DEFAULT_TEMPLATE,
      status: c.status,
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : "",
    });
    setShowForm(true);
    setPreviewHtml(false);
  };
  const API = "https://mobdigitalemail.site";

  const handleSendCampaign = async (campaignId: string) => {
  const res = await fetch(`${API}/api/send-campaign`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_API_KEY,
  },
  body: JSON.stringify({ campaignId }),
});

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Send failed");

  toast.success(`Campaign triggered`);
  await fetchData();
};
  const handleSave = async (sendNow = false) => {
  if (!form.name || !form.subject || !form.sender_email) {
    return toast.error("Name, subject, and sender email are required");
  }

  setSaving(true);

  try {
    const payload = {
      ...form,
      status: sendNow
        ? ("sending" as CampaignStatus)
        : form.scheduled_at
        ? ("scheduled" as CampaignStatus)
        : form.status,
      scheduled_at: form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : null,
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
    };

    let campaignId = editId;

    if (editId) {
      const { error } = await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", editId);

      if (error) throw error;

      toast.success("Campaign updated");
    } else {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      campaignId = data.id;

      toast.success(sendNow ? "Campaign queued for sending" : "Campaign saved");
    }

    setShowForm(false);

    await fetchData();

    if (sendNow && campaignId) {
   await handleSendCampaign(campaignId);
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setSaving(false);
  }
};
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Campaign deleted");
    setDeleteId(null);
    fetchData();
  };
  const handleBulkDelete = async () => {
  if (selectedCampaignIds.length === 0) {
    return toast.error("Select at least one campaign");
  }

  if (
    !window.confirm(
      `Delete ${selectedCampaignIds.length} selected campaigns?`
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .in("id", selectedCampaignIds);

  if (error) return toast.error(error.message);

  toast.success(`${selectedCampaignIds.length} campaigns deleted`);
  setSelectedCampaignIds([]);
  fetchData();
};

  const handleSendTest = async () => {
  if (!testEmail) {
    toast.error("Enter a test email");
    return;
  }
  try {
  const res = await fetch(`${API}/api/send-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_API_KEY,
  },
  body: JSON.stringify({
    to: testEmail,
    subject: "Test Email",
    text: "This is a test email from dashboard",
  }),
});
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Send failed");

  toast.success("Test email sent 🚀");
  setShowTestModal(false);
  setTestEmail("");
} catch (err: any) {
  toast.error(err.message);
}
};
  const getListName = (listId: string | null | undefined) =>
    listId ? lists.find(l => l.id === listId)?.name || "Unknown" : "—";
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage email campaigns</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["draft", "scheduled", "sending", "completed"] as CampaignStatus[]).map(status => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const count = campaigns.filter(c => c.status === status).length;
          return (
            <div key={status} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Campaign list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={
        campaigns.length > 0 &&
        campaigns.every((c) => selectedCampaignIds.includes(c.id))
      }
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedCampaignIds(campaigns.map((c) => c.id));
        } else {
          setSelectedCampaignIds([]);
        }
      }}
      className="w-4 h-4"
    />
    <h3 className="font-semibold text-foreground">All Campaigns</h3>
  </div>

  <div className="flex items-center gap-3">
    {selectedCampaignIds.length > 0 && (
      <button
        onClick={handleBulkDelete}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
      >
        Delete Selected ({selectedCampaignIds.length})
      </button>
    )}

    <span className="text-sm text-muted-foreground">{campaigns.length} total</span>
  </div>
</div>
          {loading ? (
  <div className="p-4 space-y-3">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="h-16 bg-muted rounded-lg animate-pulse"
      />
    ))}
  </div>
) : campaigns.length === 0 ? (
  <div className="p-12 text-center">
    <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
    <p className="text-sm text-muted-foreground">
      No campaigns yet. Create your first campaign.
    </p>
  </div>
) : (
<div className="divide-y divide-border">
            {campaigns.map(campaign => {
              const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              return (
<div
  key={campaign.id}
onClick={() => openCampaignDetails(campaign)}
  className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
>                  <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">

  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
<button
  onClick={() => navigate(`/campaigns/${campaign.id}`)}
  className="font-medium text-foreground hover:text-primary hover:underline text-left"
>
  {campaign.name}
</button>
                     <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{campaign.subject}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            List: {getListName(campaign.list_id)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(campaign.created_at), "MMM d, yyyy")}
                          </span>
                          {campaign.sent_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {campaign.sent_count.toLocaleString()} sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => { setTestCampaignId(campaign.id); setShowTestModal(true); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Test
                        </button>
                      )}
                      <button
onClick={(e) => {
  e.stopPropagation();
  openEdit(campaign);
}}                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
onClick={(e) => {
  e.stopPropagation();
  setDeleteId(campaign.id);
}}                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
     {/* Campaign Details Modal */}
  {selectedCampaign && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h3 className="font-semibold text-foreground">
            {selectedCampaign.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Campaign Details
          </p>
        </div>

        <button
          onClick={() => setSelectedCampaign(null)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{selectedCampaign.sent_count}</p>
          </div>

          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Opens</p>
            <p className="text-2xl font-bold">{selectedCampaign.open_count}</p>
          </div>

          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Clicks</p>
            <p className="text-2xl font-bold">{selectedCampaign.click_count}</p>
          </div>

          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold">{selectedCampaign.bounce_count}</p>
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Recipients</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Email delivery details for this campaign
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {campaignLogs.length} recipients
            </span>
          </div>

          {loadingLogs ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading recipient details...
            </div>
          ) : campaignLogs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No recipient logs found for this campaign.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {campaignLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {log.recipient_name || "Unknown recipient"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.recipient_email}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1">
                        {log.error_message}
                      </p>
                    )}
                  </div>

                  <span
                    className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      log.status === "sent"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {log.status === "sent" ? "Sent" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
)}
      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-foreground">{editId ? "Edit Campaign" : "Create Campaign"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Campaign details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Campaign Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Summer Sale 2024"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject Line *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="🎉 Don't miss our biggest sale of the year!"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Preview Text</label>
                  <input
                    type="text"
                    value={form.preview_text}
                    onChange={(e) => setForm(f => ({ ...f, preview_text: e.target.value }))}
                    placeholder="Exclusive deals up to 70% off — shop now"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Sender Name</label>
                    <input
                      type="text"
                      value={form.sender_name}
                      onChange={(e) => setForm(f => ({ ...f, sender_name: e.target.value }))}
                      placeholder="Mobdigital"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
  <label className="block text-sm font-medium text-foreground mb-1.5">
    Sending Domain *
  </label>

  <select
    value={form.sending_domain_id}
    onChange={(e) => {
      const domainId = e.target.value;

      setForm((f) => ({
        ...f,
        sending_domain_id: domainId,
        sender_email_id: "",
        sender_email: "",
      }));
    }}
    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
  >
    <option value="">Select a domain...</option>

    {sendingDomains.map((domain) => (
      <option key={domain.id} value={domain.id}>
        {domain.domain}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-foreground mb-1.5">
    Sender Email *
  </label>

  <select
    value={form.sender_email_id}
    disabled={!form.sending_domain_id}
    onChange={(e) => {
      const senderId = e.target.value;
      const sender = senderEmails.find((item) => item.id === senderId);

      setForm((f) => ({
        ...f,
        sender_email_id: senderId,
        sender_email: sender?.email || "",
        sender_name: sender?.sender_name || f.sender_name,
      }));
    }}
    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
  >
    <option value="">
      {form.sending_domain_id
        ? "Select sender email..."
        : "Select domain first"}
    </option>

    {senderEmails
      .filter((sender) => sender.domain_id === form.sending_domain_id)
      .map((sender) => (
        <option key={sender.id} value={sender.id}>
          {sender.email}
        </option>
      ))}
  </select>
</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Target List</label>
                    <select
                      value={form.list_id}
                      onChange={(e) => setForm(f => ({ ...f, list_id: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select a list...</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Schedule (optional)</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Template Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-foreground">Email Template (HTML)</label>
                  <button
                    onClick={() => setPreviewHtml(!previewHtml)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> {previewHtml ? "Edit" : "Preview"}
                  </button>
                </div>
                {previewHtml ? (
                  <div
                    className="border border-border rounded-lg overflow-hidden bg-white"
                    style={{ height: 300 }}
                  >
                    <iframe
                      srcDoc={form.template_html}
                      className="w-full h-full"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <textarea
                    value={form.template_html}
                    onChange={(e) => setForm(f => ({ ...f, template_html: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2 text-xs font-mono border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="HTML email template..."
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Save Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> {form.scheduled_at ? "Schedule" : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-foreground mb-1">Send Test Email</h3>
            <p className="text-sm text-muted-foreground mb-4">Send a preview to verify your template</p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowTestModal(false)} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSendTest} className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Delete Campaign?</h3>
            <p className="text-sm text-muted-foreground mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
