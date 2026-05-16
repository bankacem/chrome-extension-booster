import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// True only when real Supabase credentials are present.
// The public article system never reads this flag (it is markdown-only).
export const isSupabaseConfigured =
  Boolean(SUPABASE_URL && !SUPABASE_URL.includes("placeholder")) &&
  Boolean(SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.includes("placeholder"));

// Dev-bypass is ONLY permitted in Vite development mode (import.meta.env.DEV).
// In a production build (import.meta.env.PROD = true) this is always false,
// so missing credentials fail-closed: admin is inaccessible without real auth.
export const isDevBypass = !isSupabaseConfigured && import.meta.env.DEV;

if (isDevBypass) {
  console.warn(
    "[Admin] Supabase credentials not set. Admin login is in dev-bypass mode " +
    "(development only — production builds require real credentials). " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable real auth."
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY || "placeholder-key",
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
