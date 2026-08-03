import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase';
import { createSupabaseServerClient } from './supabase-server';

/**
 * Verifies the current request is from a signed-in Supabase Auth user who
 * is also listed in admin_users. Returns the user if so, otherwise null.
 *
 * Use this at the top of every /api/admin/* route handler — middleware.ts
 * gates the /admin *pages*, but API routes need their own independent check
 * since they can be called directly, bypassing any page-level gate.
 */
export async function requireAdmin(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: adminRow } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return adminRow ? user : null;
}
