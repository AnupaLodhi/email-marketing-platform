import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || ""
);

export type Subscriber = {
  id: string;
  name: string;
  email: string;
  country?: string | null;
  vertical?: string | null;
  status: "active" | "unsubscribed" | "bounced" | string;
  created_at: string;
};

export type List = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
};