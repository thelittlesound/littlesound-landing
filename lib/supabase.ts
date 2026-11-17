import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Next 14 caches server-side fetch() calls in Vercel's Data Cache unless told
// not to, and supabase-js talks to Supabase with fetch(). Routes that read
// cookies skip that cache, but public ones (like /api/activities, which feeds
// Discover) don't: their queries were served from a cache that survives
// deploys, so newly approved listings and newly published dates never reached
// Discover (found 2026-11-16). Every request here is live data, so never cache.
const noStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

// Public client — for use in browser/client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: noStore } });

// Admin client — for use in server-side API routes only (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: noStore } });
