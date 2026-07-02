import { useEffect, useState, useCallback } from "react";
import { supabase, type Campaign, type List } from "../../lib/supabase";
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
  list_id: "",
  template_html: "",
  status: "draft",
  scheduled_at: "",
};

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{{subject}}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">{{subject}}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">{{preview_text}}</p>
  </div>
  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Hello {{name}},</p>
    <p>Write your email content here...</p>
    <a href="{{cta_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
      Click Here
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      You're receiving this because you subscribed to our list.<br>
      <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: camps }, { data: listsData }] = await Promise.all([
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("lists").select("*").order("name"),
      ]);
      setCampaigns(camps || []);
      setLists(listsData || []);
    } catch (err: any) {
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
      list_id: c.list_id || "",
      template_html: c.template_html || DEFAULT_TEMPLATE,
      status: c.status,
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : "",
    });
    setShowForm(true);
    setPreviewHtml(false);
  };

  const handleSave = async (sendNow = false) => {
    if (!form.name || !form.subject || !form.sender_email) {
      return toast.error("Name, subject, and sender email are required");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: sendNow ? "sending" as CampaignStatus : form.scheduled_at ? "scheduled" as CampaignStatus : form.status,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        sent_count: 0,
        open_count: 0,
        click_count: 0,
        bounce_count: 0,
      };

      if (editId) {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Campaign updated");
      } else {
        const { error } = await supabase.from("campaigns").insert([payload]);
        if (error) throw error;
        toast.success(sendNow ? "Campaign queued for sending" : "Campaign saved");
      }
      setShowForm(false);
      fetchData();
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

  const handleSendTest = async () => {
    if (!testEmail) return toast.error("Enter a test email");
    const campaign = campaigns.find(c => c.id === testCampaignId);
    if (!campaign) return;

    toast.promise(
      fetch("/api/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, testEmail }),
      }).then(r => { if (!r.ok) throw new Error("Send failed"); }),
      {
        loading: `Sending test to ${testEmail}...`,
        success: "Test email sent!",
        error: "Failed — check SMTP settings in your backend",
      }
    );
    setShowTestModal(false);
    setTestEmail("");
  };

  const getListName = (listId: string | null) =>
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
          <h3 className="font-semibold text-foreground">All Campaigns</h3>
          <span className="text-sm text-muted-foreground">{campaigns.length} total</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Create your first campaign.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map(campaign => {
              const cfg = STATUS_CONFIG[campaign.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={campaign.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{campaign.name}</p>
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
                        onClick={() => openEdit(campaign)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(campaign.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats bar for completed campaigns */}
                  {campaign.status === "completed" && campaign.sent_count > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2 pl-12">
                      {[
                        { label: "Sent", value: campaign.sent_count },
                        { label: "Opens", value: campaign.open_count, pct: campaign.sent_count ? Math.round((campaign.open_count / campaign.sent_count) * 100) : 0 },
                        { label: "Clicks", value: campaign.click_count, pct: campaign.sent_count ? Math.round((campaign.click_count / campaign.sent_count) * 100) : 0 },
                        { label: "Bounces", value: campaign.bounce_count, pct: campaign.sent_count ? Math.round((campaign.bounce_count / campaign.sent_count) * 100) : 0 },
                      ].map(({ label, value, pct }) => (
                        <div key={label} className="text-center bg-muted/50 rounded-lg px-2 py-1.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{value.toLocaleString()}</p>
                          {pct !== undefined && <p className="text-xs text-muted-foreground">{pct}%</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                      placeholder="Mob Digital"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Sender Email *</label>
                    <input
                      type="email"
                      value={form.sender_email}
                      onChange={(e) => setForm(f => ({ ...f, sender_email: e.target.value }))}
                      placeholder="hello@mobdigital.com"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
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
