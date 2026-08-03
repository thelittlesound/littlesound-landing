import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase-server';

/**
 * Verifies the current request is from a signed-in provider (any
 * authenticated Supabase Auth user — there's no separate allowlist for
 * providers the way there is for admins). Returns the user if signed in,
 * otherwise null.
 *
 * Use this at the top of any /api/providers/* route that should only be
 * callable by a logged-in provider (e.g. submitting a listing).
 */
export async function requireProvider(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
