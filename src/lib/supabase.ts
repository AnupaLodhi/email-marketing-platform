import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Figma Make Supabase connect injects these names; also support VITE_ prefix
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY);
console.log("SUPABASE URL:", SUPABASE_URL);
console.log("Configured:", isConfigured);

// Safe no-op builder — used when Supabase is not configured so pages don't crash
function makeMockBuilder(): any {
  const builder: any = {};
  const noop = () => builder;
  [
    "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "or", "ilike", "like", "in",
    "order", "range", "limit", "single", "head",
  ].forEach((m) => { builder[m] = noop; });
  builder.then = (resolve: any) => resolve({ data: [], count: 0, error: null });
  return builder;
}

function createMockClient(): SupabaseClient {
  return {
    from: (_table: string) => makeMockBuilder(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (_e: any, _cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: (_c: any) =>
        Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : createMockClient();

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  country: string;
  vertical: string;
  status: "active" | "unsubscribed" | "bounced";
  created_at: string;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  sender_name: string;
  sender_email: string;
  list_id: string | null;
  template_html: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
}

export interface EmailLog {
  id: string;
  campaign_id: string;
  subscriber_id: string;
  status: "sent" | "failed" | "bounced" | "opened" | "clicked";
  sent_at: string;
  error?: string | null;
}
