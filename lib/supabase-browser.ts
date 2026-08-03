'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cookie-backed Supabase client for use in client components (families
// signup/login/dashboard). Using @supabase/ssr here (instead of the plain
// client in lib/supabase.ts) means the session gets written to cookies,
// which lets server components and middleware read it too.
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
