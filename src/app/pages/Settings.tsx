import { useState } from "react";
import { toast } from "sonner";
import { Save, Mail, Lock, Server, Eye, EyeOff, Info } from "lucide-react";

export default function Settings() {
  const [smtpHost, setSmtpHost] = useState("smtp.hostinger.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const handleSave = () => {
    toast.success("Settings saved locally. Deploy with env vars for production.");
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure email sending and platform settings</p>
      </div>

      {/* SMTP Info Banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Backend required for email sending</p>
          <p className="text-xs">
            SMTP credentials must be stored as server-side environment variables (
            <code className="bg-blue-100 px-1 rounded">SMTP_HOST</code>,{" "}
            <code className="bg-blue-100 px-1 rounded">SMTP_USER</code>,{" "}
            <code className="bg-blue-100 px-1 rounded">SMTP_PASS</code>). Deploy a Supabase Edge Function
            or Express API with Nodemailer to handle sending.
          </p>
        </div>
      </div>

      {/* SMTP Config */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">SMTP Configuration</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">SMTP Host</label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Port</label>
            <select
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="587">587 (TLS)</option>
              <option value="465">465 (SSL)</option>
              <option value="25">25 (SMTP)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">SMTP Username</label>
          <input
            type="email"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder="your@hostinger-email.com"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">SMTP Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Default Sender</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">From Name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Mob Digital"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">From Email</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="hello@yourdomain.com"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nodemailer Code Reference */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Backend Setup (Nodemailer)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Deploy this as a Supabase Edge Function or Express route:</p>
        <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto text-foreground leading-relaxed">{`import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // smtp.hostinger.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send campaign in batches
async function sendCampaign(campaign, subscribers) {
  const BATCH_SIZE = 50;
  const DELAY_MS = 1000; // Rate limiting

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(sub =>
      transporter.sendMail({
        from: \`\${campaign.sender_name} <\${campaign.sender_email}>\`,
        to: sub.email,
        subject: campaign.subject,
        html: campaign.template_html
          .replace(/{{name}}/g, sub.name),
      })
    ));
    if (i + BATCH_SIZE < subscribers.length)
      await new Promise(r => setTimeout(r, DELAY_MS));
  }
}`}</pre>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}
